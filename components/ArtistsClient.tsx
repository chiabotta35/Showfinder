'use client'
import { useState, useEffect } from 'react'
import Shell from './Shell'
import { useSettings } from './SettingsContext'
import type { ScoredArtist } from '@/types'

interface Props {
  lastfmUser: { username: string; displayName: string } | null
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
  lastfmConnected: boolean
}

const ARTIST_CACHE_TTL_MS = 30 * 60 * 1000
const PERIODS = [
  { value: '7day', label: '7d' },
  { value: '1month', label: '1m' },
  { value: '3month', label: '3m' },
  { value: '6month', label: '6m' },
  { value: '12month', label: '12m' },
  { value: 'overall', label: 'All' },
]

function Avatar({ name, size = 64 }: { name: string; size?: number }) {
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

export default function ArtistsClient({ lastfmUser, savedLocation, lastfmConnected }: Props) {
  const { settings } = useSettings()
  const [artists, setArtists] = useState<ScoredArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>('6month')
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [searching, setSearching] = useState<string | null>(null)

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
            setLoading(false)
            return
          }
        }
      } catch {}
    }
    const res = await fetch(`/api/artists?period=${period}`)
    const data = await res.json()
    setArtists(data.artists ?? [])
    setLoading(false)
    try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data })) } catch {}
  }

  function searchArtist(name: string) {
    setSearching(name)
    try {
      localStorage.setItem('lastShowsArtists', JSON.stringify([name]))
      if (savedLocation) {
        localStorage.setItem('lastShowsLocation', JSON.stringify({
          city: savedLocation.city, region: savedLocation.region, country: 'US',
          latitude: savedLocation.lat, longitude: savedLocation.lng, hubs: [],
        }))
      }
    } catch {}
    setTimeout(() => { window.location.href = '/shows' }, 100)
  }

  function askRemove(name: string) { setConfirmRemove(name) }
  function cancelRemove() { setConfirmRemove(null) }

  async function confirmRemoveArtist(name: string, source: 'lastfm' | 'manual') {
    setConfirmRemove(null)
    if (source === 'manual') {
      await fetch('/api/artists/saved', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      invalidateArtistCache()
      loadArtists()
    }
  }

  return (
    <Shell route="artists" savedLocation={savedLocation} userName={lastfmUser?.displayName || 'User'}>
      <div className="page artists">
        <header className="page-head">
          <div>
            <h1 className="page-title">Artists</h1>
            <div className="greeting" style={{ marginTop: 4 }}>{artists.length} artists synced{lastfmConnected ? ' · Last.fm' : ''}</div>
          </div>
        </header>

        <div className="seg" style={{ width: 'fit-content' }}>
          {PERIODS.map(p => (
            <button key={p.value} className={`seg-btn ${period === p.value ? 'on' : ''}`}
              onClick={() => setPeriod(p.value)}
              style={period === p.value ? { color: 'var(--accent-ink)', background: 'var(--accent)' } : {}}>
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="artist-grid">
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius)' }} />)}
          </div>
        ) : artists.length === 0 ? (
          <div className="empty">
            <div className="empty-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5"><path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM3 20a5 5 0 0 1 10 0M16 14a5 5 0 0 1 5 5" /></svg></div>
            <div className="empty-title">No artists found</div>
            <div className="empty-sub">Connect Last.fm or add artists manually.</div>
          </div>
        ) : (
          <div className="artist-grid">
            {artists.map(a => (
              <button key={a.name} className="artist-grid-card" onClick={() => searchArtist(a.name)}>
                <Avatar name={a.name} size={64} />
                <div className="agc-name">{a.name}</div>
                <div className="agc-plays">{a.playCount?.toLocaleString() ?? 0} plays</div>
                {a.source === 'manual' && <span className="manual-badge" style={{ marginTop: 4 }}>MANUAL</span>}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {searching === a.name && <span className="status-dot pulse" style={{ background: 'var(--accent)' }} />}
                </div>
              </button>
            ))}
          </div>
        )}

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
                  : 'This will hide this artist from the dashboard.'}
              </p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={cancelRemove} style={{ padding: '9px 16px', fontSize: 13, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>Cancel</button>
                <button onClick={() => { const a = artists.find(x => x.name === confirmRemove); if (a) confirmRemoveArtist(a.name, a.source as 'lastfm' | 'manual') }}
                  style={{ padding: '9px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#ff6f6f', color: '#fff', fontWeight: 700, fontSize: 13 }}>Remove</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Shell>
  )
}
