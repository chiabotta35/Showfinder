'use client'
import { useState, useEffect } from 'react'
import NavDock from './NavDock'

interface SeedArtist { name: string; playCount?: number; score?: number }
interface RecArtist { name: string; match: number; basedOn: string; url: string; isRediscovery: boolean }
interface DriftedArtist { name: string; playCount?: number; score?: number; url?: string }

export default function DiscoverClient() {
  const [tab, setTab] = useState<'recs' | 'drifted'>('recs')
  const [loading, setLoading] = useState(true)
  const [seeds, setSeeds] = useState<SeedArtist[]>([])
  const [drifted, setDrifted] = useState<DriftedArtist[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [recs, setRecs] = useState<RecArtist[]>([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [noLastfm, setNoLastfm] = useState(false)

  useEffect(() => {
    const dis = JSON.parse(localStorage.getItem('dismissedArtists') ?? '[]')
    setDismissed(new Set(dis))
    fetch('/api/discover').then(r => r.json()).then(d => {
      if (d.noLastfm) { setNoLastfm(true); setLoading(false); return }
      setSeeds(d.seeds ?? []); setDrifted(d.drifted ?? [])
      setLoading(false)
    })
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

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'Outfit' }}>Loading…<NavDock /></div>

  if (noLastfm) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', gap: '16px' }}>
      <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '18px', color: 'var(--text)' }}>Connect Last.fm first</p>
      <a href="/api/auth/lastfm" style={{ background: 'var(--accent)', color: '#000', borderRadius: '10px', padding: '12px 24px', fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', textDecoration: 'none' }}>Connect Last.fm</a>
      <NavDock />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 16px 20px' }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: '20px' }}>Discover</h1>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[['recs','Recommendations'],['drifted','Drifted from']].map(([t, label]) => (
            <button key={t} onClick={() => setTab(t as any)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: tab === t ? 'var(--accent)' : 'var(--surface)', color: tab === t ? '#000' : 'var(--text-muted)', fontFamily: 'Outfit', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>{label}</button>
          ))}
        </div>

        {tab === 'recs' && (
          <div>
            <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>Pick artists to base recommendations on:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {seeds.map(a => (
                <button key={a.name} onClick={() => toggleSeed(a.name)} style={{ padding: '6px 12px', borderRadius: '8px', border: `1px solid ${selected.has(a.name) ? 'var(--accent)' : 'var(--border)'}`, background: selected.has(a.name) ? 'rgba(200,255,87,0.15)' : 'var(--surface)', color: selected.has(a.name) ? 'var(--accent)' : 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '12px', cursor: 'pointer', fontWeight: selected.has(a.name) ? 600 : 400 }}>{a.name}</button>
              ))}
            </div>
            {selected.size > 0 && (
              <button onClick={getRecs} disabled={recsLoading} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '10px', padding: '11px 22px', fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', cursor: 'pointer', marginBottom: '20px', opacity: recsLoading ? 0.6 : 1 }}>{recsLoading ? 'Finding…' : `Recommend based on ${selected.size} artist${selected.size > 1 ? 's' : ''}`}</button>
            )}
            {recs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {recs.map(r => (
                  <div key={r.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{r.name}</p>
                      <p style={{ fontFamily: 'Outfit', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>Based on {r.basedOn} · {Math.round(r.match * 100)}% match{r.isRediscovery ? ' · Revisit' : ' · New'}</p>
                    </div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'Outfit', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>View →</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'drifted' && (
          <div>
            <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>Artists you loved but haven't played recently:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {drifted.filter(a => !dismissed.has(a.name)).map(a => (
                <div key={a.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{a.name}</p>
                    {a.playCount && <p style={{ fontFamily: 'Outfit', fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px' }}>{a.playCount.toLocaleString()} total plays</p>}
                  </div>
                  <button onClick={() => dismiss(a.name)} style={{ fontSize: '11px', color: 'var(--text-dim)', background: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'Outfit' }}>Dismiss</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <NavDock />
    </div>
  )
}
