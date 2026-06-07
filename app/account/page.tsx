import { getSession } from '@/lib/session'
import { getUserById, getSavedArtists } from '@/lib/db'
import AccountClient from '@/components/AccountClient'
export default async function AccountPage() {
  const session = await getSession()
  let lastfmUser: { username: string; displayName: string; scrobbleCount?: number; timeFormat?: string } | null = null
  let userData: { displayName: string; lastfmUsername: string; createdAt: string; city: string; region: string } | null = null
  let lastfmConnected = false
  if (session.userId) {
    const user = getUserById(session.userId)
    if (user) {
      userData = {
        displayName: user.displayName ?? user.lastfmDisplayName ?? 'User',
        lastfmUsername: user.lastfmUsername ?? '',
        createdAt: new Date(user.createdAt).toISOString(),
        city: user.lastLocation?.city ?? '',
        region: user.lastLocation?.region ?? '',
      }
      if (user.lastfmUsername) {
        lastfmUser = { username: user.lastfmUsername, displayName: user.lastfmDisplayName ?? user.displayName ?? user.lastfmUsername, scrobbleCount: user.scrobbleCount, timeFormat: user.timeFormat }
        lastfmConnected = true
      }
    }
  } else if (session.lastfm) {
    lastfmUser = { username: session.lastfm.username, displayName: session.lastfm.displayName, scrobbleCount: session.lastfm.scrobbleCount, timeFormat: '12h' }
    lastfmConnected = true
    userData = { displayName: session.lastfm.displayName, lastfmUsername: session.lastfm.username, createdAt: new Date().toISOString(), city: '', region: '' }
  }
  if (!userData) userData = { displayName: lastfmUser?.displayName ?? 'User', lastfmUsername: lastfmUser?.username ?? '', createdAt: new Date().toISOString(), city: '', region: '' }
  return <AccountClient user={userData} lastfmConnected={lastfmConnected} />
}
