import { getSession } from '@/lib/session'
import { TOURING_HUBS } from '@/lib/location'
import ShowsClient from '@/components/ShowsClient'
import { getUserById, getSavedArtists } from '@/lib/db'
import type { TouringHub } from '@/types'

export default async function ShowsPage({ searchParams }: { searchParams: Promise<{ lat?: string; lng?: string; city?: string; region?: string; country?: string; hubs?: string }> }) {
  const { lat, lng, city, region, country, hubs } = await searchParams
  const session = await getSession()
  if (!lat || !lng) {
    if (session.userId) {
      const user = getUserById(session.userId)
      if (user?.lastLocation) {
        return <ShowsClient initialLocation={{ latitude: user.lastLocation.lat, longitude: user.lastLocation.lng, city: user.lastLocation.city, region: user.lastLocation.region, country: 'US' }} initialHubs={[]} initialArtistNames={getSavedArtists(session.userId).map(a => a.name)} />
      }
    }
    return <ShowsClient initialLocation={{ latitude: 0, longitude: 0, city: '', region: '', country: 'US' }} initialHubs={[]} initialArtistNames={[]} />
  }
  const initialHubs: TouringHub[] = hubs ? hubs.split(',').filter(Boolean).map(id => TOURING_HUBS.find(h => h.id === id)).filter((h): h is TouringHub => !!h) : []
  let artistNames: string[] = []
  if (session.userId) {
    artistNames = getSavedArtists(session.userId).map(a => a.name)
  } else if (session.savedArtists) {
    artistNames = session.savedArtists.map(a => a.name)
  }
  return <ShowsClient initialLocation={{ latitude: parseFloat(lat), longitude: parseFloat(lng), city: city ?? '', region: region ?? '', country: country ?? 'US' }} initialHubs={initialHubs} initialArtistNames={artistNames} />
}
