import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import Dashboard from '@/components/Dashboard'
export default async function DashboardPage() {
  const session = await getSession()
  let lastfmUser: { username: string; displayName: string; scrobbleCount?: number } | null = null, savedLocation = null, lastfmConnected = false
  if (session.userId) {
    const user = getUserById(session.userId)
    if (user) {
      lastfmUser = { username: user.lastfmUsername ?? '', displayName: user.displayName ?? user.lastfmDisplayName ?? '', scrobbleCount: user.scrobbleCount }
      lastfmConnected = !!user.lastfmUsername
      if (user.lastLocation) savedLocation = user.lastLocation
    }
  } else if (session.lastfm) {
    lastfmUser = { username: session.lastfm.username, displayName: session.lastfm.displayName, scrobbleCount: session.lastfm.scrobbleCount }
    lastfmConnected = true
  }
  return <Dashboard lastfmUser={lastfmUser} savedLocation={savedLocation} lastfmConnected={lastfmConnected} />
}
