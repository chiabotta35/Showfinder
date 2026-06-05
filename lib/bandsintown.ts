import type { Show, TouringHub, UserLocation } from '@/types'
const BANDSINTOWN_API = 'https://rest.bandsintown.com'
const APP_ID = process.env.BANDSINTOWN_APP_ID!
const TRIBUTE_INDICATORS = ['tribute','salute to','celebration of','the music of','legacy of','cover band','dedicated to','in the style of','vs.','greatest hits night']
function detectTribute(title: string, artistName: string): boolean {
  const t = title.toLowerCase(); if (t === artistName.toLowerCase()) return false
  return TRIBUTE_INDICATORS.some(i => t.includes(i))
}
function haversineDistanceMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8, dLat = ((lat2-lat1)*Math.PI)/180, dLng = ((lng2-lng1)*Math.PI)/180
  const a = Math.sin(dLat/2)**2 + Math.cos((lat1*Math.PI)/180)*Math.cos((lat2*Math.PI)/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
function isEventRelevant(lat: number, lng: number, home: UserLocation, hubs: TouringHub[]): boolean {
  if (isNaN(lat)||isNaN(lng)) return false
  if (haversineDistanceMiles(home.latitude, home.longitude, lat, lng) < 80) return true
  for (const hub of hubs) { if (haversineDistanceMiles(hub.latitude, hub.longitude, lat, lng) < 60) return true }
  return false
}
export async function getBatchArtistEvents(artists: { name: string; id: string }[], location: UserLocation, hubs: TouringHub[], concurrency = 5): Promise<Show[]> {
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
    const res = await fetch(`${BANDSINTOWN_API}/artists/${encodeURIComponent(artistName)}/events?app_id=${APP_ID}&date=upcoming`, { cache: 'no-store' })
    if (!res.ok) return []
    const events = await res.json()
    if (!Array.isArray(events)||events.length===0) return []
    return events.filter((e: any) => {
      const lat = parseFloat(e.venue?.latitude), lng = parseFloat(e.venue?.longitude)
      return isEventRelevant(lat, lng, location, hubs)
    }).map((e: any) => {
      const [date, time] = e.datetime.split('T')
      const title = e.title ?? e.lineup?.join(', ') ?? artistName
      return { id: `bit_${e.id}`, sourceIds: { bandsintown: e.id }, source: 'bandsintown' as const, artistName, venue: { id: e.venue.id, name: e.venue.name, city: e.venue.city, region: e.venue.region, country: e.venue.country, latitude: parseFloat(e.venue.latitude), longitude: parseFloat(e.venue.longitude), address: e.venue.address }, date, startTime: time?.slice(0,5)||undefined, ticketUrl: e.offers?.[0]?.url, bandsintownUrl: e.url, status: e.offers?.[0]?.status==='available'?'onsale':'unknown' as any, isFestival: (e.lineup?.length??0)>3, isTribute: detectTribute(title, artistName) }
    })
  } catch { return [] }
}
