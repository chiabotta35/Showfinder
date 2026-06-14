import type { Show, TouringHub, UserLocation } from '@/types'
import { buildHubCacheKey, getHubShows, setHubShows } from '@/lib/db'
const TM_API = 'https://app.ticketmaster.com/discovery/v2'
const API_KEY = process.env.TICKETMASTER_API_KEY!
const attractionCache = new Map<string, string | null>()

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

// Build the list of points to query, with a stable hubId-like label for the home location
// so it gets its own per-artist cache entry.
function buildQueryPoints(location: UserLocation, hubs: TouringHub[]): { point: { lat: number; lng: number }; hubId: string }[] {
  // Use rounded home coords so nearby users share the home cache entry.
  const homeId = `home_${location.latitude.toFixed(2)}_${location.longitude.toFixed(2)}`
  return [
    { point: { lat: location.latitude, lng: location.longitude }, hubId: homeId },
    ...hubs.map(h => ({ point: { lat: h.latitude, lng: h.longitude }, hubId: h.id })),
  ]
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

async function fetchEventsAtPoint(artistName: string, attractionId: string, point: { lat: number; lng: number }, hubId: string): Promise<any[]> {
  // 1. Persistent per-(artist, hub) cache — survives restarts, shared across requests.
  //    This is the big win: toggling a hub on/off re-uses cached data for the others.
  const persistentKey = buildHubCacheKey(artistName, hubId)
  const fromDb = getHubShows(persistentKey)
  if (fromDb) return fromDb
  // 2. Fall back to TM.
  const params = new URLSearchParams({ apikey: API_KEY, attractionId, latlong: `${point.lat},${point.lng}`, radius: '60', unit: 'miles', size: '20', sort: 'date,asc', classificationName: 'music' })
  const res = await fetch(`${TM_API}/events.json?${params}`, { cache: 'no-store' })
  if (!res.ok) { console.warn(`[ticketmaster] ${artistName} @ ${hubId}: ${res.status}`); return [] }
  const data = await res.json()
  const events = data._embedded?.events ?? []
  // 3. Persist non-empty results only — don't negative-cache misses.
  if (events.length > 0) setHubShows(persistentKey, events, artistName, hubId)
  return events
}

function eventToShow(e: any, artistName: string): Show {
  const venue = e._embedded?.venues?.[0]
  const pr = e.priceRanges?.[0]
  const img = e.images?.filter((i: any) => i.width >= 640).sort((a: any,b: any) => a.width-b.width)[0]
  const statusMap: any = { onsale:'onsale',offsale:'offsale',cancelled:'cancelled',postponed:'postponed',rescheduled:'rescheduled' }
  const presales = (e.sales?.presales ?? []).filter((p: any) => {
    if (!p.startDateTime) return false
    const name = (p.name ?? '').toLowerCase()
    if (/\bvip\b|package|platinum|lawn|reserved|mezzanine|balcony|general admission|suite/i.test(name)) return false
    return true
  }).map((p: any) => ({ name: p.name ?? 'Presale', startDateTime: p.startDateTime, endDateTime: p.endDateTime }))
  const publicStart = e.sales?.public?.startDateTime
  return { id: `tm_${e.id}`, sourceIds: { ticketmaster: e.id }, source: 'ticketmaster', artistName, venue: { id: venue?.id??'unknown', name: venue?.name??'Unknown', city: venue?.city?.name??'', region: venue?.state?.stateCode??'', country: venue?.country?.countryCode??'', latitude: parseFloat(venue?.location?.latitude??'0'), longitude: parseFloat(venue?.location?.longitude??'0'), address: venue?.address?.line1 }, date: e.dates.start.localDate, startTime: e.dates.start.localTime?.slice(0,5), ticketUrl: e.url, imageUrl: img?.url, status: statusMap[e.dates.status.code]??'unknown', priceRange: pr?{min:pr.min,max:pr.max,currency:pr.currency}:undefined, isFestival: e.name.toLowerCase().includes('festival')||e.name.toLowerCase().includes('fest'), isTribute: false, publicOnsaleAt: publicStart, presales }
}

async function getArtistEvents(artistName: string, artistId: string, location: UserLocation, hubs: TouringHub[]): Promise<Show[]> {
  try {
    const attractionId = await getAttractionId(artistName)
    if (!attractionId) return []
    const points = buildQueryPoints(location, hubs)
    const allShows: Show[] = []
    const seenIds = new Set<string>()
    for (const { point, hubId } of points) {
      const events = await fetchEventsAtPoint(artistName, attractionId, point, hubId)
      for (const e of events) {
        if (seenIds.has(e.id)) continue; seenIds.add(e.id)
        allShows.push(eventToShow(e, artistName))
      }
    }
    return allShows
  } catch (e) { console.warn(`[ticketmaster] ${artistName}:`, e); return [] }
}
