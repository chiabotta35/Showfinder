import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBatchArtistEvents as getBITEvents } from '@/lib/bandsintown'
import { getBatchArtistEvents as getTMEvents } from '@/lib/ticketmaster'
import { deduplicateShows } from '@/lib/dedup'
import { getEnabledHubs } from '@/lib/location'
import { buildCacheKey, getCachedShows, setCachedShows, getSavedArtists, getUserById } from '@/lib/db'
import { getSession } from '@/lib/session'
import type { ShowsResponse, UserLocation } from '@/types'

const Schema = z.object({
  artists: z.array(z.object({ id: z.string().min(1).max(200), name: z.string().min(1).max(200) })).min(1).max(50),
  location: z.object({
    city: z.string().min(1).max(100),
    region: z.string().max(100),
    country: z.string().max(100),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  enabledHubIds: z.array(z.string().max(50)).max(30).default([]),
})

async function runShowQuery(artists: { id: string; name: string }[], location: UserLocation, enabledHubIds: string[]): Promise<NextResponse<ShowsResponse | { error: string }>> {
  const hubs = getEnabledHubs(enabledHubIds)
  const cacheKey = buildCacheKey(artists.map(a => a.name), location.city, enabledHubIds)
  const cached = getCachedShows(cacheKey)
  // Only serve from cache if it has actual results — don't negative-cache empty responses.
  if (cached && cached.length > 0) {
    return NextResponse.json({ shows: cached, totalFound: cached.length, deduplicatedCount: 0, locationFilter: { homeLocation: location, enabledHubs: hubs, radiusMiles: 80 }, fromCache: true })
  }
  try {
    const [bitShows, tmShows] = await Promise.all([getBITEvents(artists, location, hubs), getTMEvents(artists, location, hubs)])
    if (bitShows.length === 0 && tmShows.length === 0) {
      console.log(`[shows] 0 events for ${artists.length} artists near ${location.city} (hubs: ${enabledHubIds.join(',') || 'none'})`)
    }
    const { shows, duplicatesRemoved } = deduplicateShows([...bitShows, ...tmShows])
    if (shows.length > 0) setCachedShows(cacheKey, shows, artists.map(a => a.name), location.city)
    return NextResponse.json({ shows, totalFound: bitShows.length + tmShows.length, deduplicatedCount: duplicatesRemoved, locationFilter: { homeLocation: location, enabledHubs: hubs, radiusMiles: 80 }, fromCache: false })
  } catch (e) {
    console.error('[shows]', e)
    return NextResponse.json({ error: 'Failed to fetch show data' }, { status: 500 })
  }
}

export async function POST(req: Request): Promise<NextResponse<ShowsResponse | { error: string }>> {
  const body = await req.json().catch(() => null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request: ' + parsed.error.issues[0]?.message }, { status: 400 })
  const { artists, location, enabledHubIds } = parsed.data
  return runShowQuery(artists, location, enabledHubIds)
}

export async function GET(req: Request): Promise<NextResponse<ShowsResponse | { error: string }>> {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')
  let city = (searchParams.get('city') ?? '').trim()
  let region = (searchParams.get('region') ?? '').trim()
  const country = (searchParams.get('country') ?? 'US').trim()
  const hubsParam = (searchParams.get('hubs') ?? '').trim()
  const artistsParam = (searchParams.get('artists') ?? '').trim()
  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 })
  }
  const enabledHubIds = hubsParam ? hubsParam.split(',').filter(Boolean) : []
  const session = await getSession()
  // Fall back to saved city/region if not provided in the URL.
  if (!city && session.userId) {
    const user = getUserById(session.userId)
    if (user?.lastLocation) {
      city = user.lastLocation.city
      region = user.lastLocation.region
    }
  }
  if (!city) city = 'Unknown'
  // Prefer the artists passed in the URL (kept client-side from /api/artists).
  // Fall back to manually-saved artists + session.savedArtists if no list is given.
  let artists: { id: string; name: string }[] = []
  if (artistsParam) {
    artists = artistsParam.split(',').map(n => n.trim()).filter(Boolean).map(n => ({ id: 'url', name: n }))
  } else if (session.userId) {
    const user = getUserById(session.userId)
    const saved = getSavedArtists(session.userId)
    if (user) artists = saved.map(a => ({ id: user.id, name: a.name }))
  } else if (session.savedArtists) {
    artists = session.savedArtists.map(a => ({ id: 'session', name: a.name }))
  }
  if (artists.length === 0) {
    return NextResponse.json({ shows: [], totalFound: 0, deduplicatedCount: 0, locationFilter: { homeLocation: { city, region, country, latitude: lat, longitude: lng }, enabledHubs: getEnabledHubs(enabledHubIds), radiusMiles: 80 }, fromCache: false })
  }
  return runShowQuery(artists, { city, region, country, latitude: lat, longitude: lng }, enabledHubIds)
}
