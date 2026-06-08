'use client'
import { useState, useEffect } from 'react'
import Shell from './Shell'
import LeafletMap from './LeafletMap'
import LocationBar from './LocationBar'
import type { Show, UserLocation, TouringHub } from '@/types'

interface Props {
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
}

export default function MapClient({ savedLocation }: Props) {
  const [location, setLocation] = useState<UserLocation | null>(savedLocation ? { city: savedLocation.city, region: savedLocation.region, country: 'US', latitude: savedLocation.lat, longitude: savedLocation.lng } : null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!location) return
    setLoading(true)
    const url = new URL('/api/shows', window.location.origin)
    url.searchParams.set('lat', String(location.latitude))
    url.searchParams.set('lng', String(location.longitude))
    if (hubs.length) url.searchParams.set('hubs', hubs.map(h => h.id).join(','))
    fetch(url.toString())
      .then(r => r.json())
      .then(d => setShows(d.shows ?? []))
      .finally(() => setLoading(false))
  }, [location, hubs])

  return (
    <Shell route="shows">
      <div className="page shows" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', padding: '32px 20px 16px' }}>
          <div style={{ marginBottom: 16, animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
            <h1 style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 4 }}>Map</h1>
            <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>{shows.length} shows plotted{location ? ` near ${location.city}` : ''}</p>
          </div>
          <LocationBar savedLocation={savedLocation} onLocationChange={(loc, h) => { setLocation(loc); setHubs(h) }} />
        </div>
        <div style={{ flex: 1, minHeight: 400, position: 'relative', animation: 'fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
          {location ? (
            <LeafletMap shows={shows} center={[location.latitude, location.longitude]} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)', fontFamily: 'var(--font-body), sans-serif', fontSize: 14 }}>
              Set a location to see shows on a map.
            </div>
          )}
        </div>
      </div>
    </Shell>
  )
}
