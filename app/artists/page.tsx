import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import Dashboard from '@/components/Dashboard'
export default async function ArtistsPage() {
  const session = await getSession()
  let lastfmUser = null, savedLocation = null
  if (session.userId) { const user = getUserById(session.userId); if (user) { lastfmUser = { username: user.lastfmUsername??'', displayName: user.displayName??user.lastfmDisplayName??'', timeFormat: user.timeFormat }; if (user.lastLocation) savedLocation = user.lastLocation } }
  else if (session.lastfm) lastfmUser = { username: session.lastfm.username, displayName: session.lastfm.displayName, timeFormat: '12h' as const }
  return <Dashboard lastfmUser={lastfmUser} savedLocation={savedLocation} />
}
