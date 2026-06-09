import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import ArtistsClient from '@/components/ArtistsClient'

export default async function ArtistsPage() {
  const session = await getSession()
  let lastfmUser = null, savedLocation = null, lastfmConnected = false
  if (session.userId) {
    const user = getUserById(session.userId)
    if (user) {
      lastfmUser = { username: user.lastfmUsername ?? '', displayName: user.displayName ?? user.lastfmDisplayName ?? '' }
      lastfmConnected = !!user.lastfmUsername
      if (user.lastLocation) savedLocation = user.lastLocation
    }
  } else if (session.lastfm) {
    lastfmUser = { username: session.lastfm.username, displayName: session.lastfm.displayName }
    lastfmConnected = true
  }
  return <ArtistsClient lastfmUser={lastfmUser} savedLocation={savedLocation} lastfmConnected={lastfmConnected} />
}
