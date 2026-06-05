import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import HubDashboard from '@/components/HubDashboard'
export default async function DashboardPage() {
  const session = await getSession()
  let lastfmUser = null
  if (session.userId) { const user = getUserById(session.userId); if (user) lastfmUser = { username: user.lastfmUsername??'', displayName: user.displayName??user.lastfmDisplayName??'', scrobbleCount: user.scrobbleCount } }
  else if (session.lastfm) lastfmUser = { username: session.lastfm.username, displayName: session.lastfm.displayName, scrobbleCount: session.lastfm.scrobbleCount }
  return <HubDashboard lastfmUser={lastfmUser} />
}
