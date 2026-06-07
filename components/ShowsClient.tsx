'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import NavDock from './NavDock'
import type { Show, UserLocation, ScoredArtist } from '@/types'
import { haversineDistanceMiles } from '@/lib/location'

interface Props {
  location: UserLocation
  hubIds: string[]
  lastfmUser: { displayName: string } | null
}

type SortKey = 'date' | 'artist' | 'price' | 'distance' | 'relevance'
type SourceFilter = 'all' | 'ticketmaster' | 'bandsintown'

function formatDate(date: string, time?: string, fmt: '12h' | '24h' = '12h') {
  const d = new Date(date + 'T12:00:00')
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (!time) return dateStr
  if (fmt === '24h') return `${dateStr} · ${time}`
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'; const h12 = h % 12 || 12
  return `${dateStr} · ${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

function relativeDate(date: string): string {
  const show = new Date(date + 'T12:00:00')
  const now = new Date(); now.setHours(0,0,0,0)
  const diff = Math.round((show.getTime() - now.getTime()) / 86_400_000)
  if (diff < 0) return 'past'
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff < 7) return `in ${diff} days`
  if (diff < 30) return `in ${Math.floor(diff / 7)}w`
  return `in ${Math.floor(diff / 30)}mo`
}

function statusColor(status: Show['status']) {
  switch (status) {
    case 'cancelled': return { bg: 'rgba(255,77,77,0.15)', fg: '#ff8080', label: 'CANCELLED' }
    case 'postponed': return { bg: 'rgba(255,167,38,0.15)', fg: '#ffa726', label: 'POSTPONED' }
    case 'rescheduled': return { bg: 'rgba(255,167,38,0.15)', fg: '#ffa726', label: 'RESCHEDULED' }
    case 'offsale': return { bg: 'rgba(120,120,120,0.15)', fg: 'var(--text-dim)', label: 'SOLD OUT' }
    default: return null
  }
}

function sourceLabel(source: Show['source']) {
  if (source === 'both') return 'TM · BIT'
  if (source === 'ticketmaster') return 'TM'
  return 'BIT'
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
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [artistPlays, setArtistPlays] = useState<Record<string, number>>({})
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return; fetched.current = true
    const cacheKey = `shows_${location.city}_${hubIds.join('_')}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const d = JSON.parse(cached)
        if (Date.now() - d.ts < 6 * 60 * 60 * 1000) {
          setShows(d.shows); setFromCache(true); return
        }
      } catch {}
    }
    fetchShows()
  }, [])

  async function fetchShows() {
    setLoading(true); setProgress(10)
    const intv = setInterval(() => setProgress(p => Math.min(p + Math.random() * 8, 85)), 600)
    try {
      const artistRes = await fetch(`/api/artists`)
      const artistData = await artistRes.json()
      const artistList: ScoredArtist[] = artistData.artists ?? []
      const plays: Record<string, number> = {}
      for (const a of artistList) plays[a.name.toLowerCase()] = a.playCount ?? 0
      setArtistPlays(plays)

      const res = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artists: artistList.slice(0, 50).map((a: any) => ({ id: a.mbid ?? a.name, name: a.name })),
          location,
          enabledHubIds: hubIds,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      clearInterval(intv); setProgress(100)
      setShows(data.shows ?? []); setFromCache(data.fromCache ?? false)
      const cacheKey = `shows_${location.city}_${hubIds.join('_')}`
      localStorage.setItem(cacheKey, JSON.stringify({ shows: data.shows, ts: Date.now() }))
      localStorage.setItem('lastShowsUrl', window.location.pathname + window.location.search)
    } catch (e) { setError('Failed to load shows.'); clearInterval(intv) }
    setLoading(false)
  }

  const cities = useMemo(() => [...new Set(shows.map(s => s.venue.city))].sort(), [shows])

  const filtered = useMemo(() => {
    let list = shows
    if (cityFilter.size > 0) list = list.filter(s => cityFilter.has(s.venue.city))
    if (sourceFilter !== 'all') {
      if (sourceFilter === 'ticketmaster') list = list.filter(s => s.source === 'ticketmaster' || s.source === 'both')
      else list = list.filter(s => s.source === 'bandsintown' || s.source === 'both')
    }
    const sorted = [...list]
    switch (sortKey) {
      case 'date':
        sorted.sort((a, b) => a.date.localeCompare(b.date))
        break
      case 'artist':
        sorted.sort((a, b) => a.artistName.localeCompare(b.artistName))
        break
      case 'price': {
        const p = (s: Show) => s.priceRange?.min ?? Number.POSITIVE_INFINITY
        sorted.sort((a, b) => p(a) - p(b))
        break
      }
      case 'distance': {
        const d = (s: Show) => haversineDistanceMiles(location.latitude, location.longitude, s.venue.latitude, s.venue.longitude)
        sorted.sort((a, b) => d(a) - d(b))
        break
      }
      case 'relevance': {
        const p = (s: Show) => artistPlays[s.artistName.toLowerCase()] ?? 0
        sorted.sort((a, b) => p(b) - p(a))
        break
      }
    }
    return sorted
  }, [shows, cityFilter, sourceFilter, sortKey, artistPlays, location])

  const sorts: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'Date' },
    { key: 'artist', label: 'Artist' },
    { key: 'price', label: 'Price' },
    { key: 'distance', label: 'Distance' },
    { key: 'relevance', label: 'Relevance' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 16px 20px' }}>
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px' }}>Shows</h1>
          <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            {shows.length > 0 ? `${shows.length} show${shows.length === 1 ? '' : 's'} near ${location.city}${location.region ? `, ${location.region}` : ''}` : `Near ${location.city}${location.region ? `, ${location.region}` : ''}`}
            {fromCache && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}> · cached</span>}
          </p>
        </div>

        {loading && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ height: '3px', background: 'var(--surface)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', width: `${progress}%`, transition: 'width 0.4s ease', borderRadius: '2px' }} />
            </div>
            <p style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-dim)', marginTop: '8px' }}>Searching Ticketmaster + Bandsintown for your artists…</p>
          </div>
        )}

        {error && <p style={{ color: 'var(--red)', fontFamily: 'Outfit', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}

        {!loading && shows.length > 0 && (
          <>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button onClick={() => setView('list')} style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: view === 'list' ? 'var(--accent)' : 'var(--surface)', color: view === 'list' ? '#000' : 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '12px', cursor: 'pointer' }}>List</button>
              <button onClick={() => setView('map')} style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: view === 'map' ? 'var(--accent)' : 'var(--surface)', color: view === 'map' ? '#000' : 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '12px', cursor: 'pointer' }}>Map</button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Sort by</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {sorts.map(s => (
                  <button key={s.key} onClick={() => setSortKey(s.key)} style={{ fontSize: '12px', fontFamily: 'Outfit', padding: '6px 12px', borderRadius: '7px', border: '1px solid var(--border)', background: sortKey === s.key ? 'var(--accent)' : 'var(--surface)', color: sortKey === s.key ? '#000' : 'var(--text-muted)', cursor: 'pointer', fontWeight: sortKey === s.key ? 600 : 400 }}>{s.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Source</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['all','ticketmaster','bandsintown'] as SourceFilter[]).map(s => (
                  <button key={s} onClick={() => setSourceFilter(s)} style={{ fontSize: '11px', fontFamily: 'Outfit', padding: '5px 10px', borderRadius: '6px', border: `1px solid ${sourceFilter === s ? 'var(--accent)' : 'var(--border)'}`, background: sourceFilter === s ? 'rgba(200,255,87,0.12)' : 'var(--surface)', color: sourceFilter === s ? 'var(--accent)' : 'var(--text-dim)', cursor: 'pointer' }}>{s === 'all' ? 'All' : s === 'ticketmaster' ? 'Ticketmaster' : 'Bandsintown'}</button>
                ))}
              </div>
            </div>

            {cities.length > 1 && (
              <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>City</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {cities.map(c => (
                    <button key={c} onClick={() => setCityFilter(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })} style={{ padding: '4px 10px', borderRadius: '6px', border: `1px solid ${cityFilter.has(c) ? 'var(--accent)' : 'var(--border)'}`, background: cityFilter.has(c) ? 'rgba(200,255,87,0.12)' : 'var(--surface)', color: cityFilter.has(c) ? 'var(--accent)' : 'var(--text-dim)', fontFamily: 'Outfit', fontSize: '11px', cursor: 'pointer' }}>{c}</button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && view === 'list' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 && !loading && <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>{shows.length === 0 ? 'No upcoming shows found.' : 'No shows match the filters.'}</p>}
            {filtered.map(show => {
              const sc = statusColor(show.status)
              const dist = Math.round(haversineDistanceMiles(location.latitude, location.longitude, show.venue.latitude, show.venue.longitude))
              const rel = relativeDate(show.date)
              return (
                <div key={show.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                  {sc && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: sc.bg, color: sc.fg, fontSize: '10px', fontFamily: 'Syne', fontWeight: 700, padding: '3px 12px', letterSpacing: '1px' }}>
                      {sc.label}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginTop: sc ? 14 : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '4px', letterSpacing: '-0.2px' }}>{show.artistName}</p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{show.venue.name} · {show.venue.city}, {show.venue.region}</p>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Outfit', fontSize: '11px', color: 'var(--text)' }}>{formatDate(show.date, show.startTime, timeFormat)}</span>
                        {rel !== 'past' && <span style={{ fontSize: '10px', color: 'var(--accent)', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{rel}</span>}
                        <span style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'Outfit' }}>· {dist}mi</span>
                        {show.priceRange && <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'Outfit' }}>· ${show.priceRange.min}{show.priceRange.max > show.priceRange.min ? `–$${show.priceRange.max}` : ''}</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flexShrink: 0, alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-dim)', fontFamily: 'Syne', fontWeight: 700, letterSpacing: '0.5px', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px' }}>{sourceLabel(show.source)}</span>
                      {show.ticketUrl && <a href={show.ticketUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', background: 'var(--accent)', color: '#000', borderRadius: '6px', padding: '5px 10px', fontFamily: 'Syne', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Tickets</a>}
                    </div>
                  </div>
                </div>
              )
            })}
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
