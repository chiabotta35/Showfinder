import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import MapClient from '@/components/MapClient'
export default async function MapPage({ searchParams }: { searchParams: Promise<{ lat?: string; lng?: string; city?: string; region?: string; hubs?: string }> }) {
  const { lat, lng, city, region, hubs } = await searchParams
  const session = await getSession()
  let savedLocation: { city: string; region: string; lat: number; lng: number } | null = null
  if (lat && lng) {
    return <MapClient savedLocation={{ city: city ?? '', region: region ?? '', lat: parseFloat(lat), lng: parseFloat(lng) }} />
  }
  if (session.userId) {
    const user = getUserById(session.userId)
    if (user?.lastLocation) {
      savedLocation = { city: user.lastLocation.city, region: user.lastLocation.region, lat: user.lastLocation.lat, lng: user.lastLocation.lng }
    }
  }
  return <MapClient savedLocation={savedLocation} />
}
