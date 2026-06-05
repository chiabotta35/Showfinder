import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getTopArtists } from '@/lib/lastfm'
import { getUserById, getSavedArtists, touchUser } from '@/lib/db'
import type { ArtistsResponse, ScoredArtist, LastfmPeriod } from '@/types'
const VALID_PERIODS: LastfmPeriod[] = ['overall','12month','6month','3month','1month','7day']
export async function GET(req: Request): Promise<NextResponse<ArtistsResponse|{error:string}>> {
  const session = await getSession()
  const period = (VALID_PERIODS.includes(new URL(req.url).searchParams.get('period') as LastfmPeriod) ? new URL(req.url).searchParams.get('period') : 'overall') as LastfmPeriod
  let lastfmUsername: string|undefined, savedArtists: {name:string;mbid?:string}[] = []
  if (session.userId) {
    const user = getUserById(session.userId)
    if (user) { touchUser(session.userId); lastfmUsername = user.lastfmUsername; savedArtists = getSavedArtists(session.userId) }
  } else if (session.lastfm) { lastfmUsername = session.lastfm.username; savedArtists = session.savedArtists??[] }
  let lastfmArtists: ScoredArtist[] = []
  if (lastfmUsername) { try { lastfmArtists = await getTopArtists(lastfmUsername, period, 100) } catch(e){console.error(e)} }
  const lastfmNames = new Set(lastfmArtists.map(a=>a.name.toLowerCase()))
  const manualArtists: ScoredArtist[] = savedArtists.filter(a=>!lastfmNames.has(a.name.toLowerCase())).map(a=>({name:a.name,score:0,mbid:a.mbid,source:'manual' as const}))
  const artists = [...lastfmArtists,...manualArtists]
  return NextResponse.json({artists,totalTracked:artists.length,lastfmConnected:!!lastfmUsername,period})
}
