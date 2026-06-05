import { getSession } from '@/lib/session'
import { getUserById, getSavedArtists } from '@/lib/db'
import AccountClient from '@/components/AccountClient'
export default async function AccountPage() {
  const session = await getSession()
  let lastfmUser: { username: string; displayName: string; scrobbleCount?: number; timeFormat?: string } | null = null
  let savedArtistCount = 0
  if (session.userId) {
    const user = getUserById(session.userId)
    if (user && user.lastfmUsername) { lastfmUser = { username: user.lastfmUsername, displayName: user.lastfmDisplayName??user.displayName??user.lastfmUsername, scrobbleCount: user.scrobbleCount, timeFormat: user.timeFormat }; savedArtistCount = getSavedArtists(session.userId).length }
  } else if (session.lastfm) { lastfmUser = { username: session.lastfm.username, displayName: session.lastfm.displayName, scrobbleCount: session.lastfm.scrobbleCount, timeFormat: '12h' }; savedArtistCount = session.savedArtists?.length??0 }
  return <AccountClient lastfmUser={lastfmUser} savedArtistCount={savedArtistCount} />
}
