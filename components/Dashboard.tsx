'use client'
import { useState, useEffect } from 'react'
import NavDock from './NavDock'
import LocationBar from './LocationBar'
import ArtistSearch from './ArtistSearch'
import SettingsPanel from './SettingsPanel'
import { useSettings } from './SettingsContext'
import type { ScoredArtist, UserLocation, TouringHub } from '@/types'

interface Props {
  lastfmUser: { username: string; displayName: string; timeFormat?: string } | null
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
}

const HIDDEN_KEY = 'showfinder_hidden_artists'
const ARTIST_CACHE_TTL_MS = 30 * 60 * 1000

function loadHidden(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')) } catch { return new Set() }
}
function saveHidden(s: Set<string>) {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s])) } catch {}
}

export default function Dashboard({ lastfmUser, savedLocation }: Props) {
  const { settings } = useSettings()
  const [artists, setArtists] = useState<ScoredArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>('6month')
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set())
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [showHidden, setShowHidden] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => { setHidden(loadHidden()) }, [])
  useEffect(() => { loadArtists() }, [period])

  function invalidateArtistCache() {
    for (const p of ['7day','1month','3month','6month','12month','overall']) {
      try { localStorage.removeItem(`showfinder_artists_${p}`) } catch {}
    }
  }

  async function loadArtists() {
    setLoading(true)
    const cacheKey = `showfinder_artists_${period}`
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(cacheKey)
        if (raw) {
          const { ts, data } = JSON.parse(raw)
          if (Date.now() - ts < ARTIST_CACHE_TTL_MS) {
            setArtists(data.artists ?? [])
            setSavedNames(new Set((data.artists ?? []).filter((a: ScoredArtist) => a.source === 'manual').map((a: ScoredArtist) => a.name.toLowerCase())))
            setLoading(false)
            return
          }
        }
      } catch {}
    }
    const res = await fetch(`/api/artists?period=${period}`)
    const data = await res.json()
    setArtists(data.artists ?? [])
    setSavedNames(new Set((data.artists ?? []).filter((a: ScoredArtist) => a.source === 'manual').map((a: ScoredArtist) => a.name.toLowerCase())))
    setLoading(false)
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })) } catch {}
  }

  async function addArtist(name: string, mbid?: string) {
    await fetch('/api/artists/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mbid }) })
    invalidateArtistCache()
    loadArtists()
  }

  function askRemove(name: string) { setConfirmRemove(name) }
  function cancelRemove() { setConfirmRemove(null) }

  async function confirmRemoveArtist(name: string, source: 'lastfm' | 'manual') {
    setConfirmRemove(null)
    if (source === 'manual') {
      await fetch('/api/artists/saved', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      invalidateArtistCache()
      loadArtists()
    } else {
      const next = new Set(hidden); next.add(name.toLowerCase())
      setHidden(next); saveHidden(next)
    }
  }

  function unhide(name: string) {
    const next = new Set(hidden); next.delete(name.toLowerCase())
    setHidden(next); saveHidden(next)
  }

  async function goToShows() {
    if (!location) return
    let artistList = artists
    if (artistList.length === 0) {
      try {
        const r = await fetch('/api/artists?period=6month')
        if (r.ok) {
          const d = await r.json()
          artistList = d.artists ?? []
          setArtists(artistList)
        }
      } catch {}
    }
    if (artistList.length) {
      try { localStorage.setItem('lastShowsArtists', JSON.stringify(artistList.map(a => a.name))) } catch {}
    }
    try {
      localStorage.setItem('lastShowsLocation', JSON.stringify({
        city: location.city, region: location.region, country: location.country,
        latitude: location.latitude, longitude: location.longitude,
        hubs: hubs.map(h => h.id),
      }))
    } catch {}
    window.location.href = '/shows'
  }

  const periods = [['7day','7d'],['1month','1m'],['3month','3m'],['6month','6m'],['12month','12m'],['overall','All']]

  const hiddenArtists = artists.filter(a => hidden.has(a.name.toLowerCase()))
  const visibleArtists = showHidden ? artists : artists.filter(a => !hidden.has(a.name.toLowerCase()))
  const activeVisibleCount = artists.filter(a => !hidden.has(a.name.toLowerCase())).length
  const trackedCount = settings.trackedEvents?.length ?? 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 120 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 20px' }}>
        {/* Header */}
        <div style={{ marginBottom: 24, animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 4 }}>ShowFinder</h1>
              {lastfmUser && <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>Welcome back, {lastfmUser.displayName}</p>}
            </div>
            <button
              onClick={() => setShowSettings(true)}
              style={{
                background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
                padding: '8px 12px', cursor: 'pointer', color: 'var(--text-muted)',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                transition: 'all 0.15s',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              Settings
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24, animation: 'fadeUp 0.5s 0.05s cubic-bezier(0.16,1,0.3,1) both' }}>
          <a href="/artists" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '16px 14px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--accent)' }}>{loading ? '-' : activeVisibleCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Artists</div>
            </div>
          </a>
          <a href="/shows" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '16px 14px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>{location ? 'Find' : '-'}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Shows</div>
            </div>
          </a>
          <a href="/tracked" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '16px 14px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: '#eab308' }}>{trackedCount}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Tracked</div>
            </div>
          </a>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 24, animation: 'fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
          <a href="/discover" style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m16 8-3 6-6 3 3-6z"/></svg>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Discover</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Recommendations</div>
              </div>
            </div>
          </a>
          <button onClick={() => setShowSettings(true)} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Settings</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Theme & layout</div>
              </div>
            </div>
          </button>
        </div>

        <div className="divider" style={{ marginBottom: 20 }} />

        {/* Location & Search */}
        <LocationBar savedLocation={savedLocation} onLocationChange={(loc, h) => { setLocation(loc); setHubs(h) }} />
        <ArtistSearch onAdd={addArtist} savedNames={savedNames} />

        {lastfmUser && (
          <div style={{ marginBottom: 20 }}>
            <div className="section-label" style={{ marginBottom: 8 }}>Time period</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {periods.map(([val, label]) => (
                <button key={val} onClick={() => setPeriod(val)} className={period === val ? 'chip active' : 'chip'}>{label}</button>
              ))}
            </div>
          </div>
        )}

        <div className="divider" />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span className="section-label">
            {loading ? 'Loading...' : `${activeVisibleCount} ${activeVisibleCount === 1 ? 'artist' : 'artists'}`}
          </span>
          {hiddenArtists.length > 0 && (
            <button onClick={() => setShowHidden(s => !s)} className="chip" style={{ fontSize: 10 }}>
              {showHidden ? 'Hide' : 'Show'} {hiddenArtists.length} hidden
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 56, animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ) : visibleArtists.length === 0 && hiddenArtists.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-dim)', fontFamily: 'Outfit, sans-serif', fontSize: 14 }}>
            <p style={{ marginBottom: 8 }}>No artists found.</p>
            <p style={{ fontSize: 12, color: 'var(--text-faint)' }}>Add one above or connect Last.fm.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {visibleArtists.map((artist, i) => {
              const isHidden = hidden.has(artist.name.toLowerCase())
              return (
                <div
                  key={artist.name}
                  className="card"
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px 16px', gap: 12,
                    opacity: isHidden ? 0.55 : 1,
                    animation: `fadeUp 0.4s ${i * 0.03}s cubic-bezier(0.16,1,0.3,1) both`,
                  }}
                >
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, color: 'var(--text-faint)', minWidth: 26, textAlign: 'right' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</p>
                    {artist.playCount != null && (
                      <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{artist.playCount.toLocaleString()} plays</p>
                    )}
                  </div>
                  {artist.source === 'manual' && (
                    <span style={{ fontSize: 9, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--r-xs)', padding: '2px 6px', letterSpacing: 0.5 }}>MANUAL</span>
                  )}
                  {isHidden ? (
                    <button
                      onClick={() => unhide(artist.name)}
                      style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent)', borderRadius: 'var(--r-sm)', padding: '5px 10px', cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
                    >Restore</button>
                  ) : (
                    <button
                      onClick={() => askRemove(artist.name)}
                      aria-label={`Remove ${artist.name}`}
                      style={{
                        fontSize: 18, lineHeight: 1, color: 'var(--text-faint)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: '4px 8px', fontFamily: 'Outfit, sans-serif',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-faint)'}
                    >&times;</button>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {location && activeVisibleCount > 0 && (
          <div style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 500, animation: 'fadeUp 0.4s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
            <button onClick={goToShows} className="btn-primary" style={{ padding: '14px 28px', fontSize: 15, borderRadius: 'var(--r-lg)', boxShadow: '0 8px 28px var(--accent-glow)', whiteSpace: 'nowrap' }}>
              Find Shows Near {location.city} &rarr;
            </button>
          </div>
        )}
      </div>

      {confirmRemove && (
        <div onClick={cancelRemove} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div onClick={e => e.stopPropagation()} className="card" style={{ padding: 24, maxWidth: 380, width: '100%', animation: 'fadeUp 0.3s cubic-bezier(0.16,1,0.3,1)' }}>
            <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Remove {confirmRemove}?</p>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.5 }}>
              {artists.find(a => a.name === confirmRemove)?.source === 'manual'
                ? 'This will permanently remove this artist from your saved list.'
                : 'This will hide this artist from your view. You can restore it later using the "Show hidden" button.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={cancelRemove} className="btn-ghost" style={{ padding: '9px 16px', fontSize: 13 }}>Cancel</button>
              <button
                onClick={() => {
                  const a = artists.find(x => x.name === confirmRemove)
                  if (a) confirmRemoveArtist(a.name, a.source as 'lastfm' | 'manual')
                }}
                style={{
                  padding: '9px 16px', borderRadius: 'var(--r-md)', border: 'none',
                  background: 'var(--red)', color: '#fff',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >Remove</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      <NavDock />
    </div>
  )
}
