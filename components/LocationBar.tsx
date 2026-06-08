'use client'
import { useState, useEffect, useRef } from 'react'
import type { UserLocation, TouringHub } from '@/types'
import { TOURING_HUBS, getNearestHubs, haversineDistanceMiles } from '@/lib/location'
import { CITIES, cityToLocation } from '@/lib/cities'

interface Props {
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
  onLocationChange: (loc: UserLocation, hubs: TouringHub[]) => void
}

const RECENT_KEY = 'showfinder_recent_locations'
const MAX_RECENT = 5

function loadRecent(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}
function saveRecent(list: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT))) } catch {}
}

interface Match { displayName: string; latitude: number; longitude: number; region?: string }

function fuzzyMatchLocal(query: string): Match | null {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return null
  const all: Match[] = [
    ...TOURING_HUBS.map(h => ({ displayName: h.name, latitude: h.latitude, longitude: h.longitude, region: h.region })),
    ...CITIES.map(c => ({ displayName: c.name, latitude: c.latitude, longitude: c.longitude, region: c.region })),
  ]
  const direct = all.find(c => c.displayName.toLowerCase().includes(q))
  if (direct) return direct
  const qWords = q.split(/\s+/).filter(Boolean)
  const wordMatch = all.find(c => {
    const nameWords = c.displayName.toLowerCase().split(/[\s,]+/)
    return qWords.every(qw => nameWords.some(w => w.startsWith(qw)))
  })
  if (wordMatch) return wordMatch
  const prefix = all.find(c => c.displayName.toLowerCase().split(/[\s,]+/)[0].startsWith(q))
  if (prefix) return prefix
  return null
}

export default function LocationBar({ savedLocation, onLocationChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Match[]>([])
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [hubsExpanded, setHubsExpanded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRecent(loadRecent())
    if (savedLocation && isFinite(savedLocation.lat) && isFinite(savedLocation.lng) && (savedLocation.lat !== 0 || savedLocation.lng !== 0)) {
      const loc: UserLocation = { city: savedLocation.city, region: savedLocation.region, country: 'US', latitude: savedLocation.lat, longitude: savedLocation.lng }
      setLocation(loc); setQuery(`${loc.city}, ${loc.region}`)
      ;(async () => {
        try {
          const res = await fetch(`/api/location?lat=${loc.latitude}&lng=${loc.longitude}`)
          if (!res.ok) { onLocationChange(loc, []); return }
          const data = await res.json()
          const nearbyHubs: TouringHub[] = data.suggestedHubs ?? []
          setHubs(nearbyHubs)
          onLocationChange(loc, nearbyHubs)
        } catch {
          onLocationChange(loc, [])
        }
      })()
    }
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function fetchHubs(lat: number, lng: number, loc: UserLocation) {
    const res = await fetch(`/api/location?lat=${lat}&lng=${lng}`)
    if (!res.ok) return
    const data = await res.json()
    const nearbyHubs: TouringHub[] = data.suggestedHubs ?? []
    setHubs(nearbyHubs); onLocationChange(loc, nearbyHubs)
    fetch('/api/location/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: loc.city, region: loc.region, latitude: lat, longitude: lng }) })
  }

  function recordRecent(display: string) {
    const next = [display, ...recent.filter(r => r !== display)].slice(0, MAX_RECENT)
    setRecent(next); saveRecent(next)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value; setQuery(val); setGeoError('')
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setResults([]); return }
    const local = fuzzyMatchLocal(val)
    if (local) setResults([local])
    else setResults([])
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: val }) })
        const data = await res.json()
        const api: Match[] = data.results ?? []
        const seen = new Set<string>()
        const merged: Match[] = []
        for (const r of results.concat(api)) {
          const k = r.displayName.toLowerCase()
          if (seen.has(k)) continue
          seen.add(k); merged.push(r)
        }
        setResults(merged.slice(0, 7))
      } catch { /* keep prior */ }
      setLoading(false)
    }, 400)
  }

  async function selectLocation(r: Match) {
    const parts = r.displayName.split(', ')
    const loc: UserLocation = {
      city: parts[0],
      region: r.region ?? parts[1] ?? '',
      country: parts[2] ?? 'US',
      latitude: r.latitude,
      longitude: r.longitude,
    }
    setLocation(loc); setQuery(r.displayName); setOpen(false); setResults([])
    recordRecent(r.displayName)
    await fetchHubs(r.latitude, r.longitude, loc)
  }

  function useGeolocation() {
    setGeoError('')
    if (!navigator.geolocation) { setGeoError('Your browser does not support location.'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const res = await fetch(`/api/location?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)
          if (!res.ok) throw new Error('reverse geocode failed')
          const data = await res.json()
          const loc: UserLocation = {
            city: data.city ?? 'Current location',
            region: data.region ?? '',
            country: data.country ?? 'US',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }
          const display = `${loc.city}${loc.region ? ', ' + loc.region : ''}`
          setLocation(loc); setQuery(display); setOpen(false); setResults([])
          recordRecent(display)
          await fetchHubs(loc.latitude, loc.longitude, loc)
        } catch {
          setGeoError('Could not determine your city.')
        } finally { setGeoLoading(false) }
      },
      err => {
        setGeoLoading(false)
        if (err.code === err.PERMISSION_DENIED) setGeoError('Location permission denied.')
        else if (err.code === err.POSITION_UNAVAILABLE) setGeoError('Location unavailable.')
        else setGeoError('Could not get your location.')
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    )
  }

  const hubMatchesQuery = query.trim().length >= 2
    ? TOURING_HUBS.filter(h => {
        const q = query.toLowerCase()
        return h.name.toLowerCase().includes(q) || h.region.toLowerCase().includes(q)
      })
    : []
  const hubList = location ? getNearestHubs(location.latitude, location.longitude, 5) : TOURING_HUBS.slice(0, 5)
  const visibleHubs = hubsExpanded ? TOURING_HUBS : hubList

  return (
    <div ref={wrapRef} className="locationbar" style={{ marginBottom: 16 }}>
      <button className="loc-trigger" onClick={() => setOpen(o => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" /><circle cx="12" cy="9" r="2.5" />
        </svg>
        <span className="loc-current">{query || 'Enter your city…'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="loc-dropdown">
          <div className="loc-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input autoFocus value={query} onChange={handleInput} placeholder="Search city…" />
            {query && <button className="loc-clear" onClick={() => { setQuery(''); setResults([]) }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>}
          </div>

          <button className="loc-geo" onClick={useGeolocation} disabled={geoLoading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={geoLoading ? 'spin' : ''}>
              <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            {geoLoading ? 'Locating…' : 'Use my current location'}
          </button>

          {results.length > 0 && (
            <div className="loc-group">
              <div className="loc-group-label">
                {hubMatchesQuery.length > 0 && results[0]?.displayName.toLowerCase() === hubMatchesQuery[0]?.name.toLowerCase() ? 'Touring hubs' : 'Cities'}
              </div>
              {results.map((r, i) => (
                <button key={`r-${i}`} className="loc-opt" onClick={() => selectLocation(r)}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" /><circle cx="12" cy="9" r="2.5" />
                  </svg>
                  {r.displayName}
                </button>
              ))}
            </div>
          )}

          {hubMatchesQuery.length > 0 && results[0]?.displayName.toLowerCase() !== hubMatchesQuery[0]?.name.toLowerCase() && (
            <div className="loc-group">
              <div className="loc-group-label">Touring hubs</div>
              {hubMatchesQuery.slice(0, 5).map(h => (
                <button key={h.id} className="loc-opt" onClick={() => selectLocation({ displayName: h.name, latitude: h.latitude, longitude: h.longitude, region: h.region })}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" /><circle cx="12" cy="9" r="2.5" />
                  </svg>
                  {h.name}
                </button>
              ))}
            </div>
          )}

          {recent.length > 0 && query.trim().length < 2 && (
            <div className="loc-group">
              <div className="loc-group-label">Recent</div>
              {recent.map((r, i) => (
                <button key={`h-${i}`} className="loc-opt" onClick={() => { setQuery(r); handleInput({ target: { value: r } } as any) }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                  </svg>
                  {r}
                </button>
              ))}
            </div>
          )}

          {query && results.length === 0 && !loading && (
            <div className="loc-none">No cities match &ldquo;{query}&rdquo;</div>
          )}
        </div>
      )}

      {geoError && <p style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-body), sans-serif', marginTop: 6 }}>{geoError}</p>}

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="section-label">{location ? 'Nearest hubs' : 'Popular hubs'}</span>
          {location && TOURING_HUBS.length > 5 && (
            <button onClick={() => setHubsExpanded(e => !e)} style={{ fontSize: 11, color: 'var(--dim)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body), sans-serif' }}>
              {hubsExpanded ? 'Less' : `All ${TOURING_HUBS.length}`}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {visibleHubs.map(h => {
            const dist = location ? haversineDistanceMiles(location.latitude, location.longitude, h.latitude, h.longitude) : null
            return (
              <button key={h.id} className="chip" onClick={() => selectLocation({ displayName: h.name, latitude: h.latitude, longitude: h.longitude, region: h.region })}>
                {h.name}{dist != null && <span style={{ opacity: 0.6 }}> · {Math.round(dist)}mi</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
