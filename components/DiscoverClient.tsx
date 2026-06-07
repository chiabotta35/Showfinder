'use client'
import { useState, useEffect } from 'react'
import NavDock from './NavDock'
import LocationBar from './LocationBar'
import ArtistSearch from './ArtistSearch'
import type { UserLocation, TouringHub, ScoredArtist } from '@/types'
import { useRouter } from 'next/navigation'

interface SeedArtist { name: string; playCount?: number; score?: number }
interface RecArtist { name: string; match: number; basedOn: string; url: string; isRediscovery: boolean }
interface DriftedArtist { name: string; playCount?: number; score?: number; url?: string }

interface Props {
  isLoggedIn: boolean
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
  lastfmConnected: boolean
}

export default function DiscoverClient({ isLoggedIn, savedLocation, lastfmConnected }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'recs' | 'drifted' | 'search'>('recs')
  const [loading, setLoading] = useState(true)
  const [seeds, setSeeds] = useState<SeedArtist[]>([])
  const [drifted, setDrifted] = useState<DriftedArtist[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recs, setRecs] = useState<RecArtist[]>([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [noLastfm, setNoLastfm] = useState(false)
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set())

  useEffect(() => {
    const dis = JSON.parse(localStorage.getItem('dismissedArtists') ?? '[]')
    setDismissed(new Set(dis))
    if (savedLocation) {
      setLocation({ city: savedLocation.city, region: savedLocation.region, country: 'US', latitude: savedLocation.lat, longitude: savedLocation.lng })
    }
    if (lastfmConnected) {
      fetch('/api/discover').then(r => r.json()).then(d => {
        if (d.noLastfm) { setNoLastfm(true); setLoading(false); return }
        setSeeds(d.seeds ?? []); setDrifted(d.drifted ?? [])
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  function toggleSeed(name: string) {
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  async function getRecs() {
    if (selected.size === 0) return
    setRecsLoading(true)
    const res = await fetch('/api/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artists: Array.from(selected) }) })
    const data = await res.json(); setRecs(data.recommended ?? []); setRecsLoading(false)
  }

  function dismiss(name: string) {
    const next = new Set(dismissed); next.add(name); setDismissed(next)
    localStorage.setItem('dismissedArtists', JSON.stringify(Array.from(next)))
  }

  async function addArtist(name: string, mbid?: string) {
    await fetch('/api/artists/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mbid }) })
    setSavedNames(prev => new Set(prev).add(name.toLowerCase()))
  }

  function goToShows() {
    if (!location) return
    const params = new URLSearchParams({ lat: String(location.latitude), lng: String(location.longitude), city: location.city, region: location.region, country: location.country, hubs: hubs.map(h => h.id).join(',') })
    router.push(`/shows?${params.toString()}`)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 120 }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 20px' }}>
          <div className="skeleton" style={{ height: 32, width: 160, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 32 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 30, width: 110, animationDelay: `${i * 0.05}s` }} />)}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Array.from({ length: 18 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 26, width: 90, animationDelay: `${i * 0.03}s` }} />)}
          </div>
        </div>
        <NavDock />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 120 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 20px' }}>
        <div style={{ marginBottom: 32, animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 4 }}>Discover</h1>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>
            {lastfmConnected ? 'Find new artists based on your Last.fm history.' : 'Search for any artist to add them to your list.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 24, animation: 'fadeUp 0.5s 0.05s cubic-bezier(0.16,1,0.3,1) both' }}>
          {lastfmConnected && (
            <>
              <button onClick={() => setTab('recs')} className={tab === 'recs' ? 'chip active' : 'chip'}>Recommendations</button>
              <button onClick={() => setTab('drifted')} className={tab === 'drifted' ? 'chip active' : 'chip'}>Drifted from</button>
            </>
          )}
          <button onClick={() => setTab('search')} className={tab === 'search' ? 'chip active' : 'chip'}>Search</button>
        </div>

        {!lastfmConnected && tab === 'recs' && (
          <div className="card" style={{ padding: 24, textAlign: 'center', animation: 'fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 6 }}>Connect Last.fm for recommendations</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>We'll suggest new artists based on your scrobbles.</p>
            <button onClick={() => { const w = window.open('/api/auth/lastfm', 'lastfm', 'width=600,height=700'); const t = setInterval(() => { if (w?.closed) { clearInterval(t); router.refresh() } }, 500) }} className="btn-primary" style={{ padding: '10px 20px', fontSize: 13 }}>Connect Last.fm</button>
          </div>
        )}

        {tab === 'recs' && lastfmConnected && (
          <div style={{ animation: 'fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Pick artists to base recommendations on:</p>
            {seeds.length === 0 ? (
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-dim)' }}>No seeds available. Try syncing your Last.fm library.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                {seeds.map(a => (
                  <button
                    key={a.name}
                    onClick={() => toggleSeed(a.name)}
                    className={selected.has(a.name) ? 'chip active' : 'chip'}
                    style={selected.has(a.name) ? { background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}
                  >{a.name}</button>
                ))}
              </div>
            )}
            {selected.size > 0 && (
              <button onClick={getRecs} disabled={recsLoading} className="btn-primary" style={{ padding: '11px 22px', fontSize: 14, marginBottom: 24, opacity: recsLoading ? 0.6 : 1 }}>
                {recsLoading ? 'Finding…' : `Recommend based on ${selected.size} ${selected.size === 1 ? 'artist' : 'artists'}`}
              </button>
            )}
            {recs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {recs.map((r, i) => (
                  <div key={r.name} className="card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeUp 0.4s ${i * 0.04}s cubic-bezier(0.16,1,0.3,1) both` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>{r.name}</p>
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                        Based on {r.basedOn} · {Math.round(r.match * 100)}% match · {r.isRediscovery ? 'Revisit' : 'New'}
                      </p>
                    </div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px', textDecoration: 'none' }}>View →</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'drifted' && lastfmConnected && (
          <div style={{ animation: 'fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14 }}>Artists you loved but haven't played recently:</p>
            {drifted.filter(a => !dismissed.has(a.name)).length === 0 ? (
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-dim)' }}>No drifted artists right now.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {drifted.filter(a => !dismissed.has(a.name)).map((a, i) => (
                  <div key={a.name} className="card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', animation: `fadeUp 0.4s ${i * 0.03}s cubic-bezier(0.16,1,0.3,1) both` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>{a.name}</p>
                      {a.playCount != null && <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{a.playCount.toLocaleString()} total plays</p>}
                    </div>
                    <button onClick={() => dismiss(a.name)} className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px' }}>Dismiss</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'search' && (
          <div style={{ animation: 'fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
            <ArtistSearch onAdd={addArtist} savedNames={savedNames} />
            <div className="divider" style={{ marginTop: 24 }} />
            <div style={{ marginTop: 16 }}>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Set a location, then tap below to find shows:</p>
              <LocationBar
                savedLocation={savedLocation}
                onLocationChange={(loc, h) => { setLocation(loc); setHubs(h) }}
              />
              {location && (
                <button onClick={goToShows} className="btn-primary" style={{ padding: '12px 24px', fontSize: 14, marginTop: 8 }}>
                  Find shows near {location.city} →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <NavDock />
    </div>
  )
}
