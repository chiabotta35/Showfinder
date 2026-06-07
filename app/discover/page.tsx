import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import DiscoverClient from '@/components/DiscoverClient'
export default async function DiscoverPage() {
  const session = await getSession()
  const isLoggedIn = !!session.userId
  let savedLocation: { city: string; region: string; lat: number; lng: number } | null = null
  if (session.userId) {
    const user = getUserById(session.userId)
    if (user?.lastLocation) {
      savedLocation = { city: user.lastLocation.city, region: user.lastLocation.region, lat: user.lastLocation.lat, lng: user.lastLocation.lng }
    }
  }
  return <DiscoverClient isLoggedIn={isLoggedIn} savedLocation={savedLocation} />
}
