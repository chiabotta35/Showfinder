import { redirect } from 'next/navigation'
import MapClient from '@/components/MapClient'
export default async function MapPage({ searchParams }: { searchParams: Promise<{ lat?: string; lng?: string; city?: string; region?: string; hubs?: string }> }) {
  const { lat, lng, city, region, hubs } = await searchParams
  if (!lat || !lng) redirect('/artists')
  return <MapClient location={{ latitude: parseFloat(lat), longitude: parseFloat(lng), city: city??'', region: region??'', country: 'US' }} hubIds={hubs ? hubs.split(',').filter(Boolean) : []} />
}
