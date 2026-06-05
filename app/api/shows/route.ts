import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getBatchArtistEvents as getBITEvents } from '@/lib/bandsintown'
import { getBatchArtistEvents as getTMEvents } from '@/lib/ticketmaster'
import { deduplicateShows } from '@/lib/dedup'
import { getEnabledHubs } from '@/lib/location'
import { buildCacheKey, getCachedShows, setCachedShows } from '@/lib/db'
import type { ShowsResponse } from '@/types'
const Schema = z.object({ artists: z.array(z.object({id:z.string().min(1).max(200),name:z.string().min(1).max(200)})).min(1).max(50), location: z.object({city:z.string().min(1).max(100),region:z.string().max(100),country:z.string().max(100),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)}), enabledHubIds: z.array(z.string().max(50)).max(30).default([]) })
export async function POST(req: Request): Promise<NextResponse<ShowsResponse|{error:string}>> {
  const body = await req.json().catch(()=>null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({error:'Invalid request: '+parsed.error.issues[0]?.message},{status:400})
  const {artists,location,enabledHubIds} = parsed.data
  const hubs = getEnabledHubs(enabledHubIds)
  const cacheKey = buildCacheKey(artists.map(a=>a.name), location.city, enabledHubIds)
  const cached = getCachedShows(cacheKey)
  if (cached) return NextResponse.json({shows:cached,totalFound:cached.length,deduplicatedCount:0,locationFilter:{homeLocation:location,enabledHubs:hubs,radiusMiles:80},fromCache:true})
  try {
    const [bitShows,tmShows] = await Promise.all([getBITEvents(artists,location,hubs),getTMEvents(artists,location,hubs)])
    const {shows,duplicatesRemoved} = deduplicateShows([...bitShows,...tmShows])
    setCachedShows(cacheKey,shows,artists.map(a=>a.name),location.city)
    return NextResponse.json({shows,totalFound:bitShows.length+tmShows.length,deduplicatedCount:duplicatesRemoved,locationFilter:{homeLocation:location,enabledHubs:hubs,radiusMiles:80},fromCache:false})
  } catch(e){console.error(e);return NextResponse.json({error:'Failed to fetch show data'},{status:500})}
}
