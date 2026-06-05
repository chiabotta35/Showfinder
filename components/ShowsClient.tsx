'use client'
import { useState, useEffect, useRef } from 'react'
import NavDock from './NavDock'
import type { Show, UserLocation, TouringHub } from '@/types'

interface Props {
  location: UserLocation
  hubIds: string[]
  lastfmUser: { displayName: string } | null
}

function formatDate(date: string, time?: string, fmt: '12h' | '24h' = '12h') {
  const d = new Date(date + 'T12:00:00')
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (!time) return dateStr
  if (fmt === '24h') return `${dateStr} · ${time}`
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12
  return `${dateStr} · ${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

export default function ShowsClient({ location, hubIds, lastfmUser }: Props) {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [fromCache, setFromCache] = useState(false)
  const [timeFormat] = useState<'12h' | '24h'>('12h')
  const [cityFilter, setCityFilter] = useState<Set<string>>(new Set())
  const [view, setView] = useState<'list' | 'map'>('list')
  const fetched = useRef(false)

  const cities = [...new Set(shows.map(s => s.venue.city))].sort()
  const filtered = shows.filter(s => cityFilter.size === 0 || cityFilter.has(s.venue.city))

  useEffect(() => {
    if (fetched.current) return; fetched.current = true
    const cacheKey = `shows_${location.city}_${hubIds.join('_')}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { try { const d = JSON.parse(cached); if (Date.now() - d.ts < 6 * 60 * 60 * 1000) { setShows(d.shows); setFromCache(true); return } } catch {} }
    fetchShows()
  }, [])

  async function fetchShows() {
    setLoading(true); setProgress(10)
    const intv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 8, 85)), 600)
    try {
      const artistRes = await fetch(`/api/artists`)
      const { artists } = await artistRes.json()
      const res = await fetch('/api/shows', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artists: artists.slice(0, 50).map((a: any) => ({ id: a.mbid ?? a.name, name: a.name })), location, enabledHubIds: hubIds }) })
      if (!res.ok) throw new Error('Failed'); const data = await res.json()
      clearInterval(intv); setProgress(100)
      setShows(data.shows ?? []); setFromCache(data.fromCache ?? false)
      const cacheKey = `shows_${location.city}_${hubIds.join('_')}`
      localStorage.setItem(cacheKey, JSON.stringify({ shows: data.shows, ts: Date.now() }))
      localStorage.setItem('lastShowsUrl', window.location.pathname + window.location.search)
    } catch(e) { setError('Failed to load shows.'); clearInterval(intv) }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 16px 20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Shows</h1>
          <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Near {location.city}{location.region ? `, ${location.region}` : ''} {fromCache && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}> · cached</span>}</p>
        </div>

        {loading && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ height: '3px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', width: `${progress}%`, transition: 'width 0.4s ease', borderRadius: '2px' }} />
            </div>
            <p style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>Searching across Ticketmaster + Bandsintown…</p>
          </div>
        )}

        {error && <p style={{ color: 'var(--red)', fontFamily: 'Outfit', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}

        {!loading && shows.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <button onClick={() => setView('list')} style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: view === 'list' ? 'var(--accent)' : 'var(--surface)', color: view === 'list' ? '#000' : 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '12px', cursor: 'pointer' }}>List</button>
              <button onClick={() => setView('map')} style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: view === 'map' ? 'var(--accent)' : 'var(--surface)', color: view === 'map' ? '#000' : 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '12px', cursor: 'pointer' }}>Map</button>
            </div>
            {cities.length > 1 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {cities.map(c => (
                  <button key={c} onClick={() => setCityFilter(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })} style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${cityFilter.has(c) ? 'var(--accent)' : 'var(--border)'}`, background: cityFilter.has(c) ? 'rgba(200,255,87,0.12)' : 'var(--surface)', color: cityFilter.has(c) ? 'var(--accent)' : 'var(--text-dim)', fontFamily: 'Outfit', fontSize: '11px', cursor: 'pointer' }}>{c}</button>
                ))}
              </div>
            )}
          </>
        )}

        {!loading && view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 && !loading && <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>{shows.length === 0 ? 'No upcoming shows found.' : 'No shows match the filter.'}</p>}
            {filtered.map(show => (
              <div key={show.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '3px' }}>{show.artistName}</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>{show.venue.name} · {show.venue.city}, {show.venue.region}</p>
                    <p style={{ fontFamily: 'Outfit', fontSize: '11px', color: 'var(--text-dim)' }}>{formatDate(show.date, show.startTime, timeFormat)}</p>
                    {show.priceRange && <p style={{ fontFamily: 'Outfit', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>${show.priceRange.min}–${show.priceRange.max}</p>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    {show.ticketUrl && <a href={show.ticketUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', background: 'var(--accent)', color: '#000', borderRadius: '6px', padding: '5px 10px', fontFamily: 'Syne', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Tickets</a>}
                    {show.bandsintownUrl && <a href={show.bandsintownUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--text-muted)', borderRadius: '6px', padding: '5px 10px', fontFamily: 'Outfit', textDecoration: 'none', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>BIT →</a>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && view === 'map' && (
          <div style={{ height: '500px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <p style={{ padding: '20px', fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)' }}>Map view — switch to /map for full view</p>
          </div>
        )}
      </div>
      <NavDock />
    </div>
  )
}
