'use client'
import { useState, useEffect } from 'react'
import Shell from './Shell'
import { useSettings } from './SettingsContext'
import type { ScoredArtist, UserLocation, TouringHub } from '@/types'

interface Props {
  lastfmUser: { username: string; displayName: string; scrobbleCount?: number } | null
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
  lastfmConnected: boolean
}

const HIDDEN_KEY = 'showfinder_hidden_artists'
const ARTIST_CACHE_TTL_MS = 30 * 60 * 1000
const PERIODS = [
  { value: '7day', label: '7d' },
  { value: '1month', label: '1m' },
  { value: '3month', label: '3m' },
  { value: '6month', label: '6m' },
  { value: '12month', label: '12m' },
  { value: 'overall', label: 'All' },
]

function loadHidden(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')) } catch { return new Set() }
}
function saveHidden(s: Set<string>) {
  try { localStorage.setItem(HIDDEN_KEY, JSON.stringify([...s])) } catch {}
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  let hash = 0
  for (const c of name) hash = ((hash * 31 + c.charCodeAt(0))) >>> 0
  const hue = hash % 360
  return (
    <div className="avatar" style={{
      width: size, height: size, borderRadius: size * 0.25, fontSize: size * 0.34,
      background: `linear-gradient(135deg, oklch(0.42 0.09 ${hue}), oklch(0.30 0.07 ${hue + 40}))`,
    }}>{initials}</div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard({ lastfmUser, savedLocation, lastfmConnected }: Props) {
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

  useEffect(() => { setHidden(loadHidden()) }, [])
  useEffect(() => { loadArtists() }, [period])

  function invalidateArtistCache() {
    for (const p of ['7day', '1month', '3month', '6month', '12month', 'overall']) {
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

  const visibleArtists = showHidden ? artists : artists.filter(a => !hidden.has(a.name.toLowerCase()))
  const hiddenArtists = artists.filter(a => hidden.has(a.name.toLowerCase()))
  const activeVisibleCount = artists.filter(a => !hidden.has(a.name.toLowerCase())).length
  const trackedCount = settings.trackedEvents?.length ?? 0

  const homeCity = savedLocation ? `${savedLocation.city}${savedLocation.region ? ', ' + savedLocation.region : ''}` : '—'
  const scrobbleCount = lastfmUser?.scrobbleCount != null ? lastfmUser.scrobbleCount.toLocaleString() : '—'

  return (
    <Shell route="home" savedLocation={savedLocation} userName={lastfmUser?.displayName || 'User'} onAddArtist={addArtist}>
      <div className="page home">
        <header className="page-head">
          <div>
            <div className="greeting">{getGreeting()}, {lastfmUser?.displayName?.split(' ')[0] || 'there'}</div>
            <h1 className="page-title">Dashboard</h1>
          </div>
          <div className="head-status">
            <span className={`status-dot ${lastfmConnected ? 'pulse' : ''}`} style={{ background: lastfmConnected ? '#3ddc91' : 'var(--faint)' }} />
            {lastfmConnected ? 'Last.fm synced' : 'Not connected'}
          </div>
        </header>

        {settings.dashboardSections.quickStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <button className="stat-card" onClick={() => window.location.href = '/artists'}>
              <span className="stat-value" style={{ color: 'var(--sec-artists)' }}>{loading ? '—' : activeVisibleCount}</span>
              <span className="stat-label">Artists synced</span>
            </button>
            <button className="stat-card" onClick={() => window.location.href = '/tracked'}>
              <span className="stat-value" style={{ color: 'var(--sec-tracked)' }}>{trackedCount}</span>
              <span className="stat-label">Shows tracked</span>
            </button>
            <div className="stat-card">
              <span className="stat-value" style={{ color: 'var(--text)', fontSize: 22 }}>{homeCity}</span>
              <span className="stat-label">Home city</span>
            </div>
            <div className="stat-card">
              <span className="stat-value" style={{ color: 'var(--text)' }}>{scrobbleCount}</span>
              <span className="stat-label">Scrobbles</span>
            </div>
          </div>
        )}

        {settings.dashboardSections.topArtists && (
          <section className="block">
            <div className="block-head">
              <h2 className="block-title">Your top artists</h2>
            </div>
            <div className="seg">
              {PERIODS.map(p => (
                <button key={p.value} className={`seg-btn ${period === p.value ? 'on' : ''}`}
                  onClick={() => setPeriod(p.value)}
                  style={period === p.value ? { color: 'var(--accent-ink)', background: 'var(--accent)' } : {}}>
                  {p.label}
                </button>
              ))}
            </div>
            <div className="artist-list">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 56 }} />)
              ) : visibleArtists.length === 0 ? (
                <div className="empty"><div className="empty-title">No artists found</div><div className="empty-sub">Add one above or connect Last.fm.</div></div>
              ) : (
                visibleArtists.slice(0, 5).map((a, i) => (
                  <div key={a.name} className="artist-row">
                    <span className="ar-rank" style={{ color: 'var(--accent)' }}>{i + 1}</span>
                    <Avatar name={a.name} />
                    <div className="ar-info">
                      <div className="ar-name">{a.name}{a.source === 'manual' && <span className="manual-badge">MANUAL</span>}</div>
                      <div className="ar-plays">{a.playCount?.toLocaleString() ?? 0} plays</div>
                    </div>
                    <button className="ar-remove" onClick={() => askRemove(a.name)} title="Remove">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
            {!loading && visibleArtists.length > 5 && (
              <button className="see-all" onClick={() => window.location.href = '/artists'}>
                See all {activeVisibleCount} artists
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            )}
          </section>
        )}

      </div>

      {confirmRemove && (
        <div onClick={cancelRemove} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} className="panel" style={{ padding: 24, maxWidth: 380, width: '100%' }}>
            <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Remove {confirmRemove}?</p>
            <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 24, lineHeight: 1.5 }}>
              {artists.find(a => a.name === confirmRemove)?.source === 'manual'
                ? 'This will permanently remove this artist.'
                : 'This will hide this artist. You can restore later.'}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={cancelRemove} style={{ padding: '9px 16px', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>Cancel</button>
              <button onClick={() => { const a = artists.find(x => x.name === confirmRemove); if (a) confirmRemoveArtist(a.name, a.source as 'lastfm' | 'manual') }}
                style={{ padding: '9px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#ff6f6f', color: '#fff', fontWeight: 700, fontSize: 13 }}>Remove</button>
            </div>
          </div>
        </div>
      )}

    </Shell>
  )
}
