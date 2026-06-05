'use client'
import { useState, useRef } from 'react'

interface Props { onAdd: (name: string, mbid?: string) => void; savedNames: Set<string> }

export default function ArtistSearch({ onAdd, savedNames }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ name: string; listeners: string; mbid: string }[]>([])
  const [showDrop, setShowDrop] = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value; setQuery(v); setShowDrop(true)
    if (timer.current) clearTimeout(timer.current)
    if (v.length < 2) { setResults([]); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      const res = await fetch(`/api/artists/search?q=${encodeURIComponent(v)}`)
      const data = await res.json(); setResults(data.results ?? []); setLoading(false)
    }, 250)
  }

  function select(r: { name: string; mbid: string }) {
    onAdd(r.name, r.mbid || undefined); setQuery(''); setResults([]); setShowDrop(false)
  }

  return (
    <div style={{ position: 'relative', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 14px', gap: '8px' }}>
        <span style={{ fontSize: '13px', opacity: 0.4 }}>+</span>
        <input value={query} onChange={handleInput} onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 150)} placeholder="Add an artist manually…" style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'Outfit', fontSize: '14px' }} />
        {loading && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>…</span>}
      </div>
      {showDrop && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden', zIndex: 100 }}>
          {results.map((r, i) => {
            const already = savedNames.has(r.name.toLowerCase())
            return (
              <button key={r.mbid || i} onMouseDown={() => !already && select(r)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', color: already ? 'var(--text-dim)' : 'var(--text)', fontFamily: 'Outfit', fontSize: '13px', cursor: already ? 'default' : 'pointer', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span>{r.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{already ? '✓ added' : parseInt(r.listeners).toLocaleString() + ' listeners'}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
