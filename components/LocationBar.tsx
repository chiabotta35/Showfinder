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
const ICON_OFFSET_LEFT = 38 // padding-left(14) + icon(16) + gap(8)

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
  // Direct contains — strongest match
  const direct = all.find(c => c.displayName.toLowerCase().includes(q))
  if (direct) return direct
  // Each query word must prefix a word in the name (handles "des moi" -> "Des Moines")
  const qWords = q.split(/\s+/).filter(Boolean)
  const wordMatch = all.find(c => {
    const nameWords = c.displayName.toLowerCase().split(/[\s,]+/)
    return qWords.every(qw => nameWords.some(w => w.startsWith(qw)))
  })
  if (wordMatch) return wordMatch
  // Prefix match: query is a prefix of the first word
  const prefix = all.find(c => c.displayName.toLowerCase().split(/[\s,]+/)[0].startsWith(q))
  if (prefix) return prefix
  return null
}

export default function LocationBar({ savedLocation, onLocationChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Match[]>([])
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
    const nearbyHubs: TouringHub[] = data.suggestedHubs ?? []
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

  const dropdownPadding = { paddingLeft: ICON_OFFSET_LEFT }

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginBottom: 16 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: '6px 6px 6px 14px',
        gap: 8,
        transition: 'border-color 0.15s',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z"/>
          <circle cx="12" cy="9" r="2.5"/>
        </svg>
        <input
          value={query}
          onChange={handleInput}
          onFocus={() => setShowDropdown(true)}
          placeholder="Enter your city…"
          style={{
            flex: 1,
            minWidth: 0,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontFamily: 'Outfit, sans-serif',
            fontSize: 14,
            padding: '8px 0',
          }}
        />
        {loading && <span style={{ fontSize: 11, color: 'var(--text-dim)', padding: '0 6px' }}>…</span>}
        <button
          onClick={useGeolocation}
          disabled={geoLoading}
          className="btn-primary"
          style={{ fontSize: 11, padding: '8px 12px', whiteSpace: 'nowrap' }}
        >
          {geoLoading ? 'Locating…' : (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
              Locate
            </span>
          )}
        </button>
      </div>
      {geoError && <p style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'Outfit, sans-serif', marginTop: 6 }}>{geoError}</p>}

      {showDropdown && (results.length > 0 || recent.length > 0 || hubMatchesQuery.length > 0) && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 6,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          overflow: 'hidden',
          zIndex: 100,
          maxHeight: 340,
          overflowY: 'auto',
          boxShadow: 'var(--shadow-md)',
        }}>
          {results.length > 0 && (
            <>
              <div className="section-label" style={{ ...dropdownPadding, paddingTop: 10, paddingBottom: 4, paddingRight: 14 }}>
                {hubMatchesQuery.length > 0 && results[0]?.displayName.toLowerCase() === hubMatchesQuery[0]?.name.toLowerCase() ? 'Touring hubs' : 'Matches'}
              </div>
              {results.map((r, i) => (
                <button
                  key={`r-${i}`}
                  onMouseDown={() => selectLocation(r)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%',
                    textAlign: 'left',
                    ...dropdownPadding,
                    paddingTop: 10,
                    paddingBottom: 10,
                    paddingRight: 14,
                    background: 'none',
                    border: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    color: 'var(--text)',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span>{r.displayName}</span>
                  {r.region && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{r.region}</span>}
                </button>
              ))}
            </>
          )}
          {hubMatchesQuery.length > 0 && results[0]?.displayName.toLowerCase() !== hubMatchesQuery[0]?.name.toLowerCase() && (
            <>
              <div className="section-label" style={{ ...dropdownPadding, paddingTop: 10, paddingBottom: 4, paddingRight: 14 }}>Touring hubs</div>
              {hubMatchesQuery.slice(0, 5).map(h => (
                <button
                  key={h.id}
                  onMouseDown={() => selectLocation({ displayName: h.name, latitude: h.latitude, longitude: h.longitude, region: h.region })}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    width: '100%', textAlign: 'left', ...dropdownPadding,
                    paddingTop: 10, paddingBottom: 10, paddingRight: 14,
                    background: 'none', border: 'none',
                    borderTop: '1px solid var(--border)',
                    color: 'var(--text)', fontFamily: 'Outfit, sans-serif', fontSize: 13, cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span>{h.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{h.region}</span>
                </button>
              ))}
            </>
          )}
          {recent.length > 0 && query.trim().length < 2 && (
            <>
              <div className="section-label" style={{ ...dropdownPadding, paddingTop: 10, paddingBottom: 4, paddingRight: 14 }}>Recent</div>
              {recent.map((r, i) => (
                <button
                  key={`h-${i}`}
                  onMouseDown={() => handleInput({ target: { value: r } } as any)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', textAlign: 'left', ...dropdownPadding,
                    paddingTop: 10, paddingBottom: 10, paddingRight: 14,
                    background: 'none', border: 'none',
                    borderTop: '1px solid var(--border)',
                    color: 'var(--text-muted)', fontFamily: 'Outfit, sans-serif', fontSize: 13, cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                  <span>{r}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, paddingLeft: ICON_OFFSET_LEFT }}>
          <span className="section-label">{location ? 'Nearest hubs' : 'Popular hubs'}</span>
          {location && TOURING_HUBS.length > 5 && (
            <button onClick={() => setHubsExpanded(e => !e)} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}>
              {hubsExpanded ? 'Less' : `All ${TOURING_HUBS.length}`}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingLeft: ICON_OFFSET_LEFT }}>
          {visibleHubs.map(h => {
            const dist = location ? haversineDistanceMiles(location.latitude, location.longitude, h.latitude, h.longitude) : null
            return (
              <button
                key={h.id}
                onClick={() => selectLocation({ displayName: h.name, latitude: h.latitude, longitude: h.longitude, region: h.region })}
                className="chip"
              >
                {h.name}{dist != null && <span style={{ opacity: 0.6 }}>· {Math.round(dist)}mi</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
