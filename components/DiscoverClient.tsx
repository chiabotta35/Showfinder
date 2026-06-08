'use client'
import { useState, useEffect } from 'react'
import Shell from './Shell'
import LocationBar from './LocationBar'
import ArtistSearch from './ArtistSearch'
import type { UserLocation, TouringHub, ScoredArtist } from '@/types'

interface SeedArtist { name: string; playCount?: number; score?: number }
interface RecArtist { name: string; match: number; basedOn: string; url: string; isRediscovery: boolean }
interface DriftedArtist { name: string; playCount?: number; score?: number; url?: string }

interface Props {
  isLoggedIn: boolean
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
  lastfmConnected: boolean
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = [...name].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const bg = `hsl(${Math.abs(hue) % 360}, 50%, 35%)`
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.26, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function DiscoverClient({ isLoggedIn, savedLocation, lastfmConnected }: Props) {
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

  if (loading) {
    return (
      <Shell route="discover">
        <div className="page discover">
          <div className="skeleton" style={{ height: 32, width: 160, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 32 }} />
          <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 30, width: 110, animationDelay: `${i * 0.05}s` }} />)}
          </div>
        </div>
      </Shell>
    )
  }

  return (
    <Shell route="discover">
      <div className="page discover">
        <header className="page-head">
          <h1 className="page-title">Discover</h1>
        </header>

        <div className="disc-tabs">
          {lastfmConnected && (
            <>
              <button className={`disc-tab ${tab === 'recs' ? 'on' : ''}`} onClick={() => setTab('recs')}
                style={tab === 'recs' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>For you</button>
              <button className={`disc-tab ${tab === 'drifted' ? 'on' : ''}`} onClick={() => setTab('drifted')}
                style={tab === 'drifted' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>Drifted</button>
            </>
          )}
          <button className={`disc-tab ${tab === 'search' ? 'on' : ''}`} onClick={() => setTab('search')}
            style={tab === 'search' ? { color: 'var(--accent)', borderColor: 'var(--accent)' } : {}}>Search</button>
        </div>

        {!lastfmConnected && tab === 'recs' && (
          <div className="empty" style={{ marginTop: 24 }}>
            <div className="empty-ico">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
            <div className="empty-title">Connect Last.fm for recommendations</div>
            <div className="empty-sub">We&apos;ll suggest new artists based on your scrobbles.</div>
            <button className="btn-primary" style={{ marginTop: 12, padding: '10px 20px', fontSize: 13 }}
              onClick={() => { const w = window.open('/api/auth/lastfm', 'lastfm', 'width=600,height=700'); const t = setInterval(() => { if (w?.closed) { clearInterval(t); window.location.reload() } }, 500) }}>
              Connect Last.fm
            </button>
          </div>
        )}

        {tab === 'recs' && lastfmConnected && (
          <div>
            {seeds.length === 0 ? (
              <div className="empty" style={{ marginTop: 24 }}>
                <div className="empty-title">No seed artists</div>
                <div className="empty-sub">Try syncing your Last.fm library first.</div>
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'var(--font-body), sans-serif', marginBottom: 12 }}>Pick artists to base recommendations on:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {seeds.map(a => (
                    <button key={a.name} onClick={() => toggleSeed(a.name)} className={`pill ${selected.has(a.name) ? 'active' : ''}`}
                      style={selected.has(a.name) ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}>
                      {a.name}
                    </button>
                  ))}
                </div>
                {selected.size > 0 && (
                  <button className="btn-primary" style={{ padding: '11px 22px', fontSize: 14, marginBottom: 20 }} onClick={getRecs} disabled={recsLoading}>
                    {recsLoading ? 'Finding…' : `Recommend based on ${selected.size} ${selected.size === 1 ? 'artist' : 'artists'}`}
                  </button>
                )}
                {recs.length > 0 && (
                  <div className="rec-list">
                    {recs.map(r => (
                      <div className="rec-card" key={r.name}>
                        <Avatar name={r.name} size={44} />
                        <div className="rec-info">
                          <b>{r.name}</b>
                          <span>Based on {r.basedOn} · {Math.round(r.match * 100)}% match · {r.isRediscovery ? 'Revisit' : 'New'}</span>
                        </div>
                        <a href={r.url} target="_blank" rel="noopener noreferrer" className="add-pill" style={{ borderColor: 'var(--accent)66', color: 'var(--accent)', textDecoration: 'none' }}>
                          View
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></svg>
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'drifted' && lastfmConnected && (
          <div>
            <div className="drift-note">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5" /><path d="M12 16h.01" />
              </svg>
              Artists slipping out of rotation — catch them live before you forget.
            </div>
            {drifted.filter(a => !dismissed.has(a.name)).length === 0 ? (
              <div className="empty" style={{ marginTop: 24 }}>
                <div className="empty-title">No drifted artists</div>
                <div className="empty-sub">Your listening is consistent right now.</div>
              </div>
            ) : (
              <div className="drift-list">
                {drifted.filter(a => !dismissed.has(a.name)).map(a => (
                  <div className="drift-card" key={a.name}>
                    <Avatar name={a.name} size={44} />
                    <div className="drift-info">
                      <b>{a.name}</b>
                      {a.playCount != null && <span>{a.playCount.toLocaleString()} total plays</span>}
                    </div>
                    <button className="add-pill" onClick={() => dismiss(a.name)}>
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'search' && (
          <div className="disc-search-wrap">
            <ArtistSearch onAdd={addArtist} savedNames={savedNames} />
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 13, color: 'var(--dim)', fontFamily: 'var(--font-body), sans-serif', marginBottom: 12 }}>Set a location, then find shows:</p>
              <LocationBar savedLocation={savedLocation} onLocationChange={(loc, h) => { setLocation(loc); setHubs(h) }} />
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
