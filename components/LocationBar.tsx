'use client'
import { useState, useEffect, useRef } from 'react'
import type { UserLocation, TouringHub } from '@/types'
import { TOURING_HUBS, getNearestHubs, haversineDistanceMiles } from '@/lib/location'

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

function fuzzyMatchHub(query: string): TouringHub | null {
  const q = query.toLowerCase().trim()
  if (q.length < 2) return null
  // Direct contains
  for (const h of TOURING_HUBS) {
    if (h.name.toLowerCase().includes(q)) return h
  }
  // Word-prefix match
  for (const h of TOURING_HUBS) {
    const name = h.name.toLowerCase()
    if (name.split(/[\s,]+/).some(w => w.startsWith(q))) return h
  }
  // Each word in the query must prefix some word in the name
  for (const h of TOURING_HUBS) {
    const name = h.name.toLowerCase()
    const words = name.split(/[\s,]+/)
    if (q.split(/\s+/).every(qw => words.some(w => w.startsWith(qw)))) return h
  }
  return null
}

export default function LocationBar({ savedLocation, onLocationChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ displayName: string; latitude: number; longitude: number }[]>([])
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoError, setGeoError] = useState('')
  const [recent, setRecent] = useState<string[]>([])
  const [hubsExpanded, setHubsExpanded] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRecent(loadRecent())
    if (savedLocation) {
      const loc: UserLocation = { city: savedLocation.city, region: savedLocation.region, country: 'US', latitude: savedLocation.lat, longitude: savedLocation.lng }
      setLocation(loc); setQuery(`${loc.city}, ${loc.region}`)
      fetchHubs(loc.latitude, loc.longitude, loc)
    }
  }, [])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowDropdown(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function fetchHubs(lat: number, lng: number, loc: UserLocation) {
    const res = await fetch(`/api/location?lat=${lat}&lng=${lng}`)
    if (!res.ok) return
    const data = await res.json()
    const nearbyHubs = data.suggestedHubs ?? []
    setHubs(nearbyHubs); onLocationChange(loc, nearbyHubs)
    fetch('/api/location/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: loc.city, region: loc.region, latitude: lat, longitude: lng }) })
  }

  function recordRecent(display: string) {
    const next = [display, ...recent.filter(r => r !== display)].slice(0, MAX_RECENT)
    setRecent(next); saveRecent(next)
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value; setQuery(val); setShowDropdown(true); setGeoError('')
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setResults([]); return }
    // Instant local match against the 29 touring hubs
    const localMatch = fuzzyMatchHub(val)
    if (localMatch) {
      setResults([{ displayName: localMatch.name, latitude: localMatch.latitude, longitude: localMatch.longitude }])
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: val }) })
        const data = await res.json()
        const api: typeof results = data.results ?? []
        // De-dupe: keep local match first, then any new api results
        const seen = new Set<string>()
        const merged: typeof results = []
        for (const r of [ ...(localMatch ? [{ displayName: localMatch.name, latitude: localMatch.latitude, longitude: localMatch.longitude }] : []), ...api ]) {
          const k = r.displayName.toLowerCase()
          if (seen.has(k)) continue
          seen.add(k); merged.push(r)
        }
        setResults(merged.slice(0, 6))
      } catch { /* keep prior results */ }
      setLoading(false)
    }, 400)
  }

  async function selectLocation(r: { displayName: string; latitude: number; longitude: number }) {
    const parts = r.displayName.split(', ')
    const loc: UserLocation = { city: parts[0], region: parts[1] ?? '', country: parts[2] ?? 'US', latitude: r.latitude, longitude: r.longitude }
    setLocation(loc); setQuery(r.displayName); setShowDropdown(false); setResults([])
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
          setLocation(loc); setQuery(display); setShowDropdown(false); setResults([])
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
    <div ref={wrapRef} style={{ position: 'relative', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '6px 6px 6px 14px', gap: '8px' }}>
        <span style={{ fontSize: '14px', opacity: 0.5 }}>📍</span>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => setShowDropdown(true)}
          placeholder="Enter your city…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'Outfit', fontSize: '14px', padding: '8px 0' }}
        />
        {loading && <span style={{ fontSize: '11px', color: 'var(--text-dim)', padding: '0 6px' }}>…</span>}
        <button
          onClick={useGeolocation}
          disabled={geoLoading}
          title="Use my current location"
          style={{ fontSize: '11px', fontFamily: 'Syne', fontWeight: 700, color: '#000', background: 'var(--accent)', border: 'none', borderRadius: '7px', padding: '7px 12px', cursor: geoLoading ? 'wait' : 'pointer', opacity: geoLoading ? 0.7 : 1, whiteSpace: 'nowrap' }}
        >
          {geoLoading ? 'Locating…' : '📍 Use my location'}
        </button>
      </div>
      {geoError && <p style={{ fontSize: '11px', color: 'var(--red)', fontFamily: 'Outfit', marginTop: '6px' }}>{geoError}</p>}

      {showDropdown && (results.length > 0 || recent.length > 0 || hubMatchesQuery.length > 0) && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', zIndex: 100, maxHeight: '320px', overflowY: 'auto' }}>
          {results.length > 0 && (
            <>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'Syne', fontWeight: 700, padding: '8px 14px 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Matches</p>
              {results.map((r, i) => (
                <button key={`r-${i}`} onMouseDown={() => selectLocation(r)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'Outfit', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                  {r.displayName}
                </button>
              ))}
            </>
          )}
          {hubMatchesQuery.length > 0 && hubMatchesQuery[0].name.toLowerCase() !== (results[0]?.displayName ?? '').toLowerCase() && (
            <>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'Syne', fontWeight: 700, padding: '8px 14px 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Touring hubs</p>
              {hubMatchesQuery.slice(0, 6).map(h => (
                <button key={h.id} onMouseDown={() => selectLocation({ displayName: h.name, latitude: h.latitude, longitude: h.longitude })} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'Outfit', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                  <span>{h.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-dim)' }}>{h.region}</span>
                </button>
              ))}
            </>
          )}
          {recent.length > 0 && query.trim().length < 2 && (
            <>
              <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'Syne', fontWeight: 700, padding: '8px 14px 4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent</p>
              {recent.map((r, i) => (
                <button key={`h-${i}`} onMouseDown={() => {
                  const [city, region] = r.split(', ')
                  // We don't have lat/lng for recent; use Nominatim to look up
                  handleInput({ target: { value: r } } as any)
                }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                  ↺ {r}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <p style={{ fontSize: '10px', color: 'var(--text-dim)', fontFamily: 'Syne', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {location ? 'Nearest hubs' : 'Popular hubs'}
          </p>
          {location && TOURING_HUBS.length > 5 && (
            <button onClick={() => setHubsExpanded(e => !e)} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Outfit' }}>
              {hubsExpanded ? 'Show less' : `Show all ${TOURING_HUBS.length}`}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {visibleHubs.map(h => {
            const dist = location ? haversineDistanceMiles(location.latitude, location.longitude, h.latitude, h.longitude) : null
            return (
              <button
                key={h.id}
                onClick={() => selectLocation({ displayName: h.name, latitude: h.latitude, longitude: h.longitude })}
                style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', fontFamily: 'Outfit', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {h.name}{dist != null ? ` · ${Math.round(dist)}mi` : ''}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
