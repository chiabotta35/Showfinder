import { getSession } from '@/lib/session'
import { TOURING_HUBS } from '@/lib/location'
import ShowsClient from '@/components/ShowsClient'
import { getUserById, getSavedArtists } from '@/lib/db'
import type { TouringHub, UserLocation } from '@/types'

export default async function ShowsPage({ searchParams }: { searchParams: Promise<{ lat?: string; lng?: string; city?: string; region?: string; country?: string; hubs?: string }> }) {
  const { lat, lng, city, region, country, hubs } = await searchParams
  const session = await getSession()
  // Get saved artists (manually-added) for the search even without URL params.
  const savedArtistNames = session.userId ? getSavedArtists(session.userId).map(a => a.name) : (session.savedArtists?.map(a => a.name) ?? [])

  // URL params take precedence; otherwise fall back to the user's saved location.
  let initialLocation: UserLocation
  let initialHubs: TouringHub[]
  if (lat && lng) {
    initialLocation = { latitude: parseFloat(lat), longitude: parseFloat(lng), city: city ?? '', region: region ?? '', country: country ?? 'US' }
    initialHubs = hubs ? hubs.split(',').filter(Boolean).map(id => TOURING_HUBS.find(h => h.id === id)).filter((h): h is TouringHub => !!h) : []
  } else if (session.userId) {
    const user = getUserById(session.userId)
    if (user?.lastLocation) {
      initialLocation = { latitude: user.lastLocation.lat, longitude: user.lastLocation.lng, city: user.lastLocation.city, region: user.lastLocation.region, country: 'US' }
      initialHubs = []
    } else {
      initialLocation = { latitude: 0, longitude: 0, city: '', region: '', country: 'US' }
      initialHubs = []
    }
  } else {
    initialLocation = { latitude: 0, longitude: 0, city: '', region: '', country: 'US' }
    initialHubs = []
  }

  return <ShowsClient initialLocation={initialLocation} initialHubs={initialHubs} initialArtistNames={savedArtistNames} />
}
