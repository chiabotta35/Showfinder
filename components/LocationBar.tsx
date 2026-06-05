'use client'
import { useState, useEffect, useRef } from 'react'
import type { UserLocation, TouringHub } from '@/types'
import { TOURING_HUBS } from '@/lib/location'

interface Props {
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
  onLocationChange: (loc: UserLocation, hubs: TouringHub[]) => void
}

export default function LocationBar({ savedLocation, onLocationChange }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ displayName: string; latitude: number; longitude: number }[]>([])
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (savedLocation) {
      const loc: UserLocation = { city: savedLocation.city, region: savedLocation.region, country: 'US', latitude: savedLocation.lat, longitude: savedLocation.lng }
      setLocation(loc); setQuery(`${loc.city}, ${loc.region}`)
      fetchHubs(loc.latitude, loc.longitude, loc)
    }
  }, [])

  async function fetchHubs(lat: number, lng: number, loc: UserLocation) {
    const res = await fetch(`/api/location?lat=${lat}&lng=${lng}`)
    if (!res.ok) return
    const data = await res.json()
    const nearbyHubs = data.suggestedHubs ?? []
    setHubs(nearbyHubs); onLocationChange(loc, nearbyHubs)
    fetch('/api/location/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: loc.city, region: loc.region, latitude: lat, longitude: lng }) })
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value; setQuery(val); setShowDropdown(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.length < 2) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch('/api/location', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: val }) })
      const data = await res.json(); setResults(data.results ?? []); setLoading(false)
    }, 300)
  }

  async function selectLocation(r: { displayName: string; latitude: number; longitude: number }) {
    const parts = r.displayName.split(', ')
    const loc: UserLocation = { city: parts[0], region: parts[1] ?? '', country: parts[2] ?? 'US', latitude: r.latitude, longitude: r.longitude }
    setLocation(loc); setQuery(r.displayName); setShowDropdown(false); setResults([])
    await fetchHubs(r.latitude, r.longitude, loc)
  }

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', gap: '8px' }}>
        <span style={{ fontSize: '14px', opacity: 0.5 }}>📍</span>
        <input value={query} onChange={handleInput} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 150)} placeholder="Enter your city…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'Outfit', fontSize: '14px' }} />
        {loading && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>…</span>}
      </div>
      {showDropdown && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', zIndex: 100 }}>
          {results.map((r, i) => (
            <button key={i} onMouseDown={() => selectLocation(r)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: 'var(--text)', fontFamily: 'Outfit', fontSize: '13px', cursor: 'pointer', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
              {r.displayName}
            </button>
          ))}
        </div>
      )}
      {location && hubs.length > 0 && (
        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {hubs.map(h => (
            <span key={h.id} style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '3px 8px', fontFamily: 'Outfit' }}>{h.name}</span>
          ))}
        </div>
      )}
    </div>
  )
}
