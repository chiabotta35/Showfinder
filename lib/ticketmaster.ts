import type { Show, TouringHub, UserLocation } from '@/types'
const TM_API = 'https://app.ticketmaster.com/discovery/v2'
const API_KEY = process.env.TICKETMASTER_API_KEY!
const attractionCache = new Map<string, string | null>()
// Cache event results by (attractionId, lat, lng) for the lifetime of a single batch.
const eventCache = new Map<string, { ts: number; events: any[] }>()
const EVENT_CACHE_TTL_MS = 5 * 60 * 1000

function normalizeStr(s: string): string { return s.toLowerCase().replace(/[^a-z0-9\s]/g,'').trim() }

function findBestMatch(target: string, attractions: any[]): any | null {
  const t = normalizeStr(target)
  const tributeWords = ['tribute','salute','celebration of','music of','legacy','cover','dedication']
  const exact = attractions.find(a => normalizeStr(a.name) === t)
  if (exact) return exact
  const starts = attractions.find(a => normalizeStr(a.name).startsWith(t))
  if (starts) return starts
  const candidate = attractions.find(a => { const n = normalizeStr(a.name); return n.includes(t)||t.includes(n) }) ?? attractions[0]
  if (!candidate) return null
  if (tributeWords.some(w => normalizeStr(candidate.name).includes(w)) && normalizeStr(candidate.name) !== t) return null
  return candidate
}

async function getAttractionId(artistName: string): Promise<string|null> {
  const key = artistName.toLowerCase()
  if (attractionCache.has(key)) return attractionCache.get(key)!
  try {
    const params = new URLSearchParams({ apikey: API_KEY, keyword: artistName, classificationName: 'music', size: '5' })
    const res = await fetch(`${TM_API}/attractions.json?${params}`, { cache: 'no-store' })
    if (!res.ok) { console.warn(`[ticketmaster] attractions lookup ${res.status} for "${artistName}"`); return null }
    const data = await res.json()
    const attractions = data._embedded?.attractions ?? []
    const best = findBestMatch(artistName, attractions)
    // Only cache positive hits — don't negative-cache misses so we can retry on a transient failure.
    if (best?.id) attractionCache.set(key, best.id)
    return best?.id ?? null
  } catch (e) { console.warn(`[ticketmaster] attractions lookup failed for "${artistName}":`, e); return null }
}

function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R=3958.8,dLat=((lat2-lat1)*Math.PI)/180,dLng=((lng2-lng1)*Math.PI)/180
  const a=Math.sin(dLat/2)**2+Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLng/2)**2
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
}

// Dedupe hubs that are already inside the home location's radius, so we don't re-query the same area.
function dedupedPoints(location: UserLocation, hubs: TouringHub[], radiusMiles = 60): { lat: number; lng: number }[] {
  const out: { lat: number; lng: number }[] = [{ lat: location.latitude, lng: location.longitude }]
  for (const h of hubs) {
    if (haversineDistanceMiles(location.latitude, location.longitude, h.latitude, h.longitude) <= radiusMiles) continue
    out.push({ lat: h.latitude, lng: h.longitude })
  }
  return out
}

export async function getBatchArtistEvents(artists: { name: string; id: string }[], location: UserLocation, hubs: TouringHub[], concurrency = 6): Promise<Show[]> {
  const allShows: Show[] = []
  for (let i = 0; i < artists.length; i += concurrency) {
    const chunk = artists.slice(i, i + concurrency)
    const results = await Promise.allSettled(chunk.map(a => getArtistEvents(a.name, a.id, location, hubs)))
    for (const r of results) { if (r.status === 'fulfilled') allShows.push(...r.value) }
  }
  return allShows
}

async function getArtistEvents(artistName: string, artistId: string, location: UserLocation, hubs: TouringHub[]): Promise<Show[]> {
  try {
    const attractionId = await getAttractionId(artistName)
    if (!attractionId) return []
    // Skip hubs already covered by the home location's radius.
    const points = dedupedPoints(location, hubs, 60)
    const allShows: Show[] = []; const seenIds = new Set<string>()
    for (const point of points) {
      const cacheKey = `${attractionId}|${point.lat.toFixed(2)}|${point.lng.toFixed(2)}`
      const cached = eventCache.get(cacheKey)
      let events: any[]
      if (cached && Date.now() - cached.ts < EVENT_CACHE_TTL_MS) {
        events = cached.events
      } else {
        const params = new URLSearchParams({ apikey: API_KEY, attractionId, latlong: `${point.lat},${point.lng}`, radius: '60', unit: 'miles', size: '20', sort: 'date,asc', classificationName: 'music' })
        const res = await fetch(`${TM_API}/events.json?${params}`, { cache: 'no-store' })
        if (!res.ok) { console.warn(`[ticketmaster] ${artistName}: ${res.status}`); continue }
        const data = await res.json()
        events = data._embedded?.events ?? []
        // Only cache non-empty results — if TM returned 0 for a given attraction+point,
        // let the next batch try again instead of locking in the empty result.
        if (events.length > 0) eventCache.set(cacheKey, { ts: Date.now(), events })
      }
      for (const e of events) {
        if (seenIds.has(e.id)) continue; seenIds.add(e.id)
        const venue = e._embedded?.venues?.[0]
        const pr = e.priceRanges?.[0]
        const img = e.images?.filter((i: any) => i.width >= 640).sort((a: any,b: any) => a.width-b.width)[0]
        const statusMap: any = { onsale:'onsale',offsale:'offsale',cancelled:'cancelled',postponed:'postponed',rescheduled:'rescheduled' }
        const presales = (e.sales?.presales ?? []).filter((p: any) => p.startDateTime).map((p: any) => ({ name: p.name ?? 'Presale', startDateTime: p.startDateTime, endDateTime: p.endDateTime }))
        const publicStart = e.sales?.public?.startDateTime
        allShows.push({ id: `tm_${e.id}`, sourceIds: { ticketmaster: e.id }, source: 'ticketmaster', artistName, venue: { id: venue?.id??'unknown', name: venue?.name??'Unknown', city: venue?.city?.name??'', region: venue?.state?.stateCode??'', country: venue?.country?.countryCode??'', latitude: parseFloat(venue?.location?.latitude??'0'), longitude: parseFloat(venue?.location?.longitude??'0'), address: venue?.address?.line1 }, date: e.dates.start.localDate, startTime: e.dates.start.localTime?.slice(0,5), ticketUrl: e.url, imageUrl: img?.url, status: statusMap[e.dates.status.code]??'unknown', priceRange: pr?{min:pr.min,max:pr.max,currency:pr.currency}:undefined, isFestival: e.name.toLowerCase().includes('festival')||e.name.toLowerCase().includes('fest'), isTribute: false, publicOnsaleAt: publicStart, presales })
      }
    }
    return allShows
  } catch (e) { console.warn(`[ticketmaster] ${artistName}:`, e); return [] }
}
