import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import HubDashboard from '@/components/HubDashboard'
export default async function DashboardPage() {
  const session = await getSession()
  let lastfmUser: { username: string; displayName: string; scrobbleCount?: number } | null = null
  let savedLocation: { city: string; region: string; lat: number; lng: number } | null = null
  let isLoggedIn = false
  if (session.userId) {
    isLoggedIn = true
    const user = getUserById(session.userId)
    if (user) {
      if (user.lastfmUsername) lastfmUser = { username: user.lastfmUsername, displayName: user.lastfmDisplayName ?? user.displayName ?? user.lastfmUsername, scrobbleCount: user.scrobbleCount }
      if (user.lastLocation) savedLocation = { city: user.lastLocation.city, region: user.lastLocation.region, lat: user.lastLocation.lat, lng: user.lastLocation.lng }
    }
  } else if (session.lastfm) {
    lastfmUser = { username: session.lastfm.username, displayName: session.lastfm.displayName, scrobbleCount: session.lastfm.scrobbleCount }
  }
  const { getSavedArtists } = await import('@/lib/db')
  const artistCount = session.userId ? getSavedArtists(session.userId).length : (session.savedArtists?.length ?? 0)
  return <HubDashboard isLoggedIn={isLoggedIn} lastfmUser={lastfmUser} savedLocation={savedLocation} artistCount={artistCount} />
}
