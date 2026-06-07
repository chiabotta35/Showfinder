'use client'
import { useState, useRef } from 'react'

interface Props {
  onAdd: (name: string, mbid?: string) => Promise<void>
  savedNames: Set<string>
}

export default function ArtistSearch({ onAdd, savedNames }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ name: string; mbid?: string; listeners?: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adding, setAdding] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value; setQuery(val); setError('')
    if (timerRef.current) clearTimeout(timerRef.current)
    if (val.trim().length < 2) { setResults([]); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/artists/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: val }) })
        const data = await res.json()
        setResults(data.artists ?? [])
      } catch { setError('Search failed.') }
      finally { setLoading(false) }
    }, 400)
  }

  async function add(a: { name: string; mbid?: string }) {
    setAdding(a.name)
    try { await onAdd(a.name, a.mbid); setQuery(''); setResults([]) }
    catch { setError('Failed to add artist.') }
    finally { setAdding(null) }
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div className="section-label" style={{ marginBottom: 8 }}>Add an artist</div>
      <div style={{
        display: 'flex', alignItems: 'center', background: 'var(--surface)',
        border: '1px solid var(--border)', borderRadius: 'var(--r-lg)',
        padding: '6px 14px', gap: 10, transition: 'border-color 0.15s',
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: 'var(--text-muted)' }}>
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.3-4.3"/>
        </svg>
        <input
          value={query}
          onChange={onChange}
          placeholder="Search for an artist…"
          style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'Outfit, sans-serif', fontSize: 14, padding: '8px 0' }}
        />
        {loading && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>…</span>}
      </div>
      {error && <p style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'Outfit, sans-serif', marginTop: 6 }}>{error}</p>}

      {results.length > 0 && (
        <div className="card" style={{ marginTop: 8, padding: 0, overflow: 'hidden' }}>
          {results.map((r, i) => {
            const isSaved = savedNames.has(r.name.toLowerCase())
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: 'var(--text)' }}>{r.name}</span>
                <button
                  onClick={() => add(r)}
                  disabled={isSaved || adding === r.name}
                  className="btn-primary"
                  style={{ fontSize: 11, padding: '6px 12px', opacity: isSaved ? 0.5 : 1 }}
                >
                  {isSaved ? 'Added' : adding === r.name ? '…' : 'Add'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
