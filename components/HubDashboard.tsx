'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NavDock from './NavDock'
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
      fetch('/api/location', { method: 'GET' }).then().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!isLoggedIn) return
    fetch('/api/artists?period=6month').then(r => r.json()).then(d => setArtists(d.artists ?? [])).catch(() => {})
  }, [isLoggedIn])

  function goToShows(loc: UserLocation, h: TouringHub[]) {
    const params = new URLSearchParams({ lat: String(loc.latitude), lng: String(loc.longitude), city: loc.city, region: loc.region, country: loc.country, hubs: h.map(x => x.id).join(',') })
    if (artists.length) params.set('artists', artists.map(a => a.name).join(','))
    router.push(`/shows?${params.toString()}`)
  }

  function gotoArtists() {
    if (!isLoggedIn) { router.push('/auth'); return }
    router.push('/artists')
  }

  const greeting = lastfmUser?.displayName ? `Welcome back, ${lastfmUser.displayName.split(' ')[0]}` : 'Find live shows near you'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 120 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 20px' }}>
        <header style={{ marginBottom: 32, animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>ShowFinder</p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 42, color: 'var(--text)', letterSpacing: '-1.5px', lineHeight: 1.05, marginBottom: 8 }}>{greeting}</h1>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.5 }}>
            Concerts from your favorite artists, all in one place. Powered by Last.fm + Bandsintown + Ticketmaster.
          </p>
        </header>

        {isLoggedIn && lastfmUser && (
          <div className="card" style={{ padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', animation: 'fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
            <div>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>Tracking {artistCount} {artistCount === 1 ? 'artist' : 'artists'}</p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-dim)' }}>From {lastfmUser.displayName}'s Last.fm</p>
            </div>
            <button onClick={gotoArtists} className="btn-primary" style={{ padding: '8px 16px', fontSize: 12 }}>View</button>
          </div>
        )}

        {!isLoggedIn && (
          <div className="card" style={{ padding: 20, marginBottom: 20, textAlign: 'center', animation: 'fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Connect Last.fm to get started</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>We'll find shows for the artists you already listen to.</p>
            <button onClick={() => router.push('/auth')} className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Get started</button>
          </div>
        )}

        <div style={{ marginBottom: 16, animation: 'fadeUp 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.5px' }}>Set your location</h2>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>We'll find shows within touring distance.</p>
        </div>
        <div style={{ animation: 'fadeUp 0.6s 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
          <LocationBar
            savedLocation={savedLocation}
            onLocationChange={(loc, h) => { setLocation(loc); setHubs(h) }}
          />
          {location && (
            <button onClick={() => goToShows(location, hubs)} className="btn-primary" style={{ marginTop: 16, padding: '12px 24px', fontSize: 14, width: '100%' }}>
              Find shows near {location.city} →
            </button>
          )}
        </div>
      </div>
      <NavDock />
    </div>
  )
}
