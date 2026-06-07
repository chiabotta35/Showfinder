'use client'
import { useState } from 'react'
import NavDock from './NavDock'
import LocationBar from './LocationBar'
import type { UserLocation, TouringHub } from '@/types'
import { useRouter } from 'next/navigation'

interface Props {
  isLoggedIn: boolean
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
}

export default function DiscoverClient({ isLoggedIn, savedLocation }: Props) {
  const router = useRouter()
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function search(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/artists/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) })
      const data = await res.json()
      if (data.artists?.length) {
        await fetch('/api/artists/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.artists[0].name, mbid: data.artists[0].mbid }) })
        if (location) goToShows(location, hubs)
        else router.push('/artists')
      } else {
        setError('No artists found. Try a different name.')
      }
    } catch {
      setError('Search failed. Please try again.')
    } finally { setLoading(false) }
  }

  function goToShows(loc: UserLocation, h: TouringHub[]) {
    const params = new URLSearchParams({ lat: String(loc.latitude), lng: String(loc.longitude), city: loc.city, region: loc.region, country: loc.country, hubs: h.map(x => x.id).join(',') })
    router.push(`/shows?${params.toString()}`)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 120 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 20px' }}>
        <div style={{ marginBottom: 32, animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 4 }}>Discover</h1>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: 'var(--text-muted)' }}>Search for an artist to find their upcoming shows.</p>
        </div>

        <form onSubmit={search} style={{ marginBottom: 32, animation: 'fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div style={{
            display: 'flex', alignItems: 'center', background: 'var(--surface)',
            border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
            padding: '6px 6px 6px 16px', gap: 10, transition: 'border-color 0.15s',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
            </svg>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Artist name…"
              style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'Outfit, sans-serif', fontSize: 14, padding: '8px 0' }}
            />
            <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '9px 18px', fontSize: 13 }}>
              {loading ? '…' : 'Search'}
            </button>
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'Outfit, sans-serif', marginTop: 8 }}>{error}</p>}
        </form>

        <div className="divider" />

        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 4, letterSpacing: '-0.3px' }}>Set your location</h2>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>Search results will use your selected area.</p>
        </div>
        <LocationBar
          savedLocation={savedLocation}
          onLocationChange={(loc, h) => { setLocation(loc); setHubs(h) }}
        />
      </div>
      <NavDock />
    </div>
  )
}
