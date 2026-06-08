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
      <div className="artist-search">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={query}
          onChange={onChange}
          placeholder="Search for an artist…"
        />
        {loading && <span style={{ fontSize: 11, color: 'var(--dim)' }}>…</span>}
      </div>
      {error && <p style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-body), sans-serif', marginTop: 6 }}>{error}</p>}

      {results.length > 0 && (
        <div className="rec-list" style={{ marginTop: 8 }}>
          {results.map((r, i) => {
            const isSaved = savedNames.has(r.name.toLowerCase())
            return (
              <div key={i} className="rec-card">
                <div className="rec-info" style={{ flex: 1, minWidth: 0 }}>
                  <b>{r.name}</b>
                </div>
                <button
                  onClick={() => add(r)}
                  disabled={isSaved || adding === r.name}
                  className="add-pill"
                  style={{ opacity: isSaved ? 0.5 : 1, borderColor: 'var(--accent)66', color: 'var(--accent)' }}
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
