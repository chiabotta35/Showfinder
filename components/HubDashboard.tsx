'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Shell from './Shell'
import LocationBar from './LocationBar'
import type { UserLocation, TouringHub, ScoredArtist } from '@/types'
import { TOURING_HUBS, haversineDistanceMiles, getNearestHubs } from '@/lib/location'

interface Props {
  isLoggedIn: boolean
  lastfmUser: { username: string; displayName: string } | null
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
  artistCount: number
}

export default function HubDashboard({ isLoggedIn, lastfmUser, savedLocation, artistCount }: Props) {
  const router = useRouter()
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [artists, setArtists] = useState<ScoredArtist[]>([])

  useEffect(() => {
    if (savedLocation) {
      const loc: UserLocation = { city: savedLocation.city, region: savedLocation.region, country: 'US', latitude: savedLocation.lat, longitude: savedLocation.lng }
      setLocation(loc)
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    fetch('/api/artists?period=6month').then(r => r.json()).then(d => setArtists(d.artists ?? [])).catch(() => {})
  }, [isLoggedIn])

  async function goToShows(loc: UserLocation, h: TouringHub[]) {
    let artistList = artists
    if (artistList.length === 0 && isLoggedIn) {
      try {
        const r = await fetch('/api/artists?period=6month')
        if (r.ok) {
          const d = await r.json()
          artistList = d.artists ?? []
          setArtists(artistList)
        }
      } catch {}
    }
    if (artistList.length) {
      try { localStorage.setItem('lastShowsArtists', JSON.stringify(artistList.map(a => a.name))) } catch {}
    }
    try {
      localStorage.setItem('lastShowsLocation', JSON.stringify({
        city: loc.city, region: loc.region, country: loc.country,
        latitude: loc.latitude, longitude: loc.longitude,
        hubs: h.map(x => x.id),
      }))
    } catch {}
    router.push('/shows')
  }

  function gotoArtists() {
    if (!isLoggedIn) { router.push('/auth'); return }
    router.push('/artists')
  }

  const greeting = lastfmUser?.displayName ? `Welcome back, ${lastfmUser.displayName.split(' ')[0]}` : 'Find live shows near you'

  return (
    <Shell route="home">
      <div className="page home" style={{ maxWidth: 720, margin: '0 auto' }}>

        <header style={{ marginBottom: 40, animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
          <p style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: 11, color: 'var(--home-primary)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>ShowFinder</p>
          <h1 style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 800, fontSize: 40, color: 'var(--text)', letterSpacing: '-1.5px', lineHeight: 1.1, marginBottom: 10 }}>{greeting}</h1>
          <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 15, color: 'var(--text-muted)', maxWidth: 460, lineHeight: 1.6 }}>
            Concerts from your favorite artists, all in one place.
          </p>
        </header>

        {isLoggedIn && lastfmUser && (
          <div
            className="card"
            style={{
              padding: 20,
              marginBottom: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderLeft: '3px solid var(--artists-primary)',
              animation: 'fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <div>
              <p style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: 22, color: 'var(--text)', marginBottom: 4 }}>{artistCount}</p>
              <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>artists tracked via Last.fm</p>
            </div>
            <button onClick={gotoArtists} className="btn-ghost" style={{ padding: '8px 18px', fontSize: 13, color: 'var(--artists-primary)', border: '1px solid var(--artists-primary)', borderRadius: 8 }}>
              View
            </button>
          </div>
        )}

        {!isLoggedIn && (
          <div className="card" style={{ padding: 24, marginBottom: 24, textAlign: 'center', animation: 'fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
            <p style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Connect Last.fm to get started</p>
            <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>We'll find shows for the artists you already listen to.</p>
            <button onClick={() => router.push('/auth')} className="btn-primary" style={{ padding: '10px 22px', fontSize: 13 }}>Get started</button>
          </div>
        )}

        <div style={{ marginBottom: 24, animation: 'fadeUp 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
          <h2 className="section-label" style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.5px' }}>Set your location</h2>
          <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>We'll find shows within touring distance.</p>
        </div>

        <div style={{ animation: 'fadeUp 0.6s 0.3s cubic-bezier(0.16,1,0.3,1) both', position: 'relative', zIndex: 50 }}>
          <LocationBar
            savedLocation={savedLocation}
            onLocationChange={(loc, h) => { setLocation(loc); setHubs(h) }}
          />
          {location && (
            <button
              onClick={() => {
                if (hubs.length === 0) {
                  fetch('/api/location?lat=' + location.latitude + '&lng=' + location.longitude)
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d && Array.isArray(d.suggestedHubs)) { setHubs(d.suggestedHubs); goToShows(location, d.suggestedHubs) } else { goToShows(location, []) } })
                    .catch(() => goToShows(location, []))
                } else {
                  goToShows(location, hubs)
                }
              }}
              className="btn-primary"
              style={{ marginTop: 16, padding: '12px 24px', fontSize: 14, width: '100%', background: 'var(--shows-primary)' }}
            >
              Find shows near {location.city} →
            </button>
          )}
        </div>

        {isLoggedIn && (
          <div
            className="card"
            style={{
              marginTop: 28,
              padding: 20,
              display: 'flex',
              gap: 20,
              animation: 'fadeUp 0.6s 0.35s cubic-bezier(0.16,1,0.3,1) both',
            }}
          >
            <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Tracking</p>
              <p style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{artistCount} {artistCount === 1 ? 'artist' : 'artists'}</p>
            </div>
            <div style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
              <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Status</p>
              <p style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{location ? 'Location set' : 'Set location to find shows'}</p>
            </div>
          </div>
        )}

      </div>
    </Shell>
  )
}
