import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import ShowsClient from '@/components/ShowsClient'
export default async function ShowsPage({ searchParams }: { searchParams: Promise<{ lat?: string; lng?: string; city?: string; region?: string; country?: string; hubs?: string }> }) {
  const { lat, lng, city, region, country, hubs } = await searchParams
  if (!lat || !lng) redirect('/artists')
  const session = await getSession()
  return <ShowsClient location={{ latitude: parseFloat(lat), longitude: parseFloat(lng), city: city??'', region: region??'', country: country??'US' }} hubIds={hubs ? hubs.split(',').filter(Boolean) : []} lastfmUser={session.lastfm ? { displayName: session.lastfm.displayName } : null} />
}
