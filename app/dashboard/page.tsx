import { getSession } from '@/lib/session'
import { getUserById, getSavedArtists } from '@/lib/db'
import { getTopArtists } from '@/lib/lastfm'
import HubDashboard from '@/components/HubDashboard'

const CACHE_TTL_MS = 10 * 60 * 1000
const countCache = new Map<string, { count: number; ts: number }>()

export default async function DashboardPage() {
  const session = await getSession()
  let lastfmUser: { username: string; displayName: string; scrobbleCount?: number } | null = null
  let savedLocation: { city: string; region: string; lat: number; lng: number } | null = null
  let isLoggedIn = false
  let artistCount = 0
  if (session.userId) {
    isLoggedIn = true
    const user = getUserById(session.userId)
    if (user) {
      if (user.lastfmUsername) lastfmUser = { username: user.lastfmUsername, displayName: user.lastfmDisplayName ?? user.displayName ?? user.lastfmUsername, scrobbleCount: user.scrobbleCount }
      if (user.lastLocation) savedLocation = { city: user.lastLocation.city, region: user.lastLocation.region, lat: user.lastLocation.lat, lng: user.lastLocation.lng }
      // Count = manually-saved + Last.fm top artists (default 6 months).
      const manualCount = getSavedArtists(session.userId).length
      let lastfmCount = 0
      if (user.lastfmUsername) {
        const cached = countCache.get(user.lastfmUsername)
        if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
          lastfmCount = cached.count
        } else {
          try {
            const top = await getTopArtists(user.lastfmUsername, '6month', 100)
            lastfmCount = top.length
            countCache.set(user.lastfmUsername, { count: lastfmCount, ts: Date.now() })
          } catch {}
        }
      }
      // Use whichever is higher; manual artists may overlap with Last.fm
      artistCount = Math.max(manualCount, lastfmCount)
    }
  } else if (session.lastfm) {
    lastfmUser = { username: session.lastfm.username, displayName: session.lastfm.displayName, scrobbleCount: session.lastfm.scrobbleCount }
    if (session.lastfm.username) {
      const cached = countCache.get(session.lastfm.username)
      if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        artistCount = cached.count
      } else {
        try {
          const top = await getTopArtists(session.lastfm.username, '6month', 100)
          artistCount = top.length
          countCache.set(session.lastfm.username, { count: artistCount, ts: Date.now() })
        } catch {}
      }
    }
  } else if (session.savedArtists) {
    artistCount = session.savedArtists.length
  }
  return <HubDashboard isLoggedIn={isLoggedIn} lastfmUser={lastfmUser} savedLocation={savedLocation} artistCount={artistCount} />
}
