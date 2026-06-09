'use client'
import { useState, useEffect } from 'react'
import Shell from './Shell'
import type { ScoredArtist } from '@/types'

interface SeedArtist { name: string; playCount?: number; score?: number }
interface RecArtist { name: string; match: number; basedOn: string; url: string; isRediscovery: boolean }

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
  const [loading, setLoading] = useState(true)
  const [seeds, setSeeds] = useState<SeedArtist[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recs, setRecs] = useState<RecArtist[]>([])
  const [recsLoading, setRecsLoading] = useState(false)

  useEffect(() => {
    if (lastfmConnected) {
      fetch('/api/discover').then(r => r.json()).then(d => {
        setSeeds(d.seeds ?? [])
        setLoading(false)
      }).catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [lastfmConnected])

  function toggleSeed(name: string) {
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })
  }

  async function getRecs() {
    if (selected.size === 0) return
    setRecsLoading(true)
    const res = await fetch('/api/discover', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ artists: Array.from(selected) }) })
    const data = await res.json(); setRecs(data.recommended ?? []); setRecsLoading(false)
  }

  if (loading) {
    return (
      <Shell route="discover">
        <div className="page discover">
          <div className="skeleton" style={{ height: 32, width: 160, marginBottom: 12 }} />
          <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 32 }} />
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

        {!lastfmConnected ? (
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
        ) : seeds.length === 0 ? (
          <div className="empty" style={{ marginTop: 24 }}>
            <div className="empty-title">No seed artists</div>
            <div className="empty-sub">Try syncing your Last.fm library first.</div>
          </div>
        ) : (
          <div>
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
          </div>
        )}
      </div>
    </Shell>
  )
}
