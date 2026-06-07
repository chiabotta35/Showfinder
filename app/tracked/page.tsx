import { getSession } from '@/lib/session'
import TrackedClient from '@/components/TrackedClient'
import { getSavedArtists, getUserById } from '@/lib/db'

export default async function TrackedPage() {
  const session = await getSession()
  const savedArtistNames = session.userId ? getSavedArtists(session.userId).map(a => a.name) : (session.savedArtists?.map(a => a.name) ?? [])

  return <TrackedClient savedArtistNames={savedArtistNames} />
}
