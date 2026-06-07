'use client'
import { useState, useEffect, useMemo } from 'react'
import NavDock from './NavDock'
import type { Show, UserLocation, ScoredArtist, EventSource, TouringHub } from '@/types'

interface Props {
  initialLocation: UserLocation
  initialHubs: TouringHub[]
  initialArtistNames: string[]
}

const CACHE_KEY = 'showfinder_shows_cache'
const CACHE_TTL_MS = 30 * 60 * 1000

type SortKey = 'date' | 'artist' | 'price' | 'distance' | 'relevance'
type SourceFilter = 'all' | EventSource

function dateLabel(iso: string): string {
  const d = new Date(iso)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff < 0) return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'short' }) + ` · ${Math.round(diff)}d`
  if (diff < 30) return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function haversineMi(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 3959
  const dLat = (b.latitude - a.latitude) * Math.PI / 180
  const dLng = (b.longitude - a.longitude) * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function ShowsClient({ initialLocation, initialHubs, initialArtistNames }: Props) {
  const [location, setLocation] = useState<UserLocation>(initialLocation)
  const [hubs, setHubs] = useState<TouringHub[]>(initialHubs)
  const [artistNames, setArtistNames] = useState<string[]>(() => {
    if (initialArtistNames.length) return initialArtistNames
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem('lastShowsArtists')
      if (stored) return JSON.parse(stored) as string[]
    } catch {}
    return []
  })
  const [shows, setShows] = useState<Show[]>([])
  const [artists, setArtists] = useState<ScoredArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<SortKey>('date')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  // On mount, hydrate from localStorage if no URL params were given.
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem('lastShowsLocation')
      if (stored) {
        const loc = JSON.parse(stored)
        if (loc && isFinite(loc.latitude) && isFinite(loc.longitude) && (loc.latitude !== 0 || loc.longitude !== 0)) {
          setLocation({ city: loc.city, region: loc.region, country: loc.country || 'US', latitude: loc.latitude, longitude: loc.longitude })
          if (Array.isArray(loc.hubs) && loc.hubs.length) {
            const knownHubs = (window as any).__touringHubs ?? null
            // We'll fetch the hub list once and merge ids → objects.
            fetch('/api/location?lat=' + loc.latitude + '&lng=' + loc.longitude)
              .then(r => r.json())
              .then(d => { if (Array.isArray(d.suggestedHubs)) setHubs(d.suggestedHubs) })
              .catch(() => {})
          }
        }
      }
    } catch {}
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { ts, data, locKey } = JSON.parse(raw)
        const cur = `${location.latitude},${location.longitude}`
        if (Date.now() - ts < CACHE_TTL_MS && locKey === cur) {
          setShows(data.shows ?? [])
          setArtists(data.artists ?? [])
          setLoading(false)
          return
        }
      }
    } catch {}
    loadShows()
  }, [])

  async function loadShows() {
    setLoading(true)
    const url = new URL('/api/shows', window.location.origin)
    url.searchParams.set('lat', String(location.latitude))
    url.searchParams.set('lng', String(location.longitude))
    url.searchParams.set('city', location.city)
    if (location.region) url.searchParams.set('region', location.region)
    if (hubs.length) url.searchParams.set('hubs', hubs.map(h => h.id).join(','))
    if (artistNames.length) url.searchParams.set('artists', artistNames.join(','))
    const res = await fetch(url.toString())
    const data = await res.json()
    setShows(data.shows ?? [])
    setArtists(data.artists ?? [])
    setLoading(false)
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data, locKey: `${location.latitude},${location.longitude}` })) } catch {}
  }

  function refresh() {
    try { localStorage.removeItem(CACHE_KEY) } catch {}
    loadShows()
  }

  function onLocationChange(loc: UserLocation, h: TouringHub[]) {
    setLocation(loc); setHubs(h); setPage(1)
    try { localStorage.removeItem(CACHE_KEY) } catch {}
    setTimeout(loadShows, 0)
  }

  // Map artist name -> relevance score (lower index = more relevant)
  const artistScore = useMemo(() => {
    const m = new Map<string, number>()
    artists.forEach((a, i) => m.set(a.name.toLowerCase(), i))
    return m
  }, [artists])

  const cities = useMemo(() => {
    const s = new Set<string>()
    shows.forEach(show => { if (show.venue?.city) s.add(show.venue.city) })
    return Array.from(s).sort()
  }, [shows])

  // Build "presales coming up" list — events whose public sale or any presale starts in the future (within 14d)
  const upcomingPresales = useMemo(() => {
    const now = Date.now()
    const horizon = now + 14 * 24 * 60 * 60 * 1000
    const out: { show: Show; saleAt: number; saleName: string }[] = []
    for (const s of shows) {
      const candidates: { at: number; name: string }[] = []
      if (s.publicOnsaleAt) {
        const at = new Date(s.publicOnsaleAt).getTime()
        if (at > now && at <= horizon) candidates.push({ at, name: 'Public sale' })
      }
      for (const p of s.presales ?? []) {
        const at = new Date(p.startDateTime).getTime()
        if (at > now && at <= horizon) candidates.push({ at, name: p.name })
      }
      if (candidates.length === 0) continue
      candidates.sort((a, b) => a.at - b.at)
      out.push({ show: s, saleAt: candidates[0].at, saleName: candidates[0].name })
    }
    return out.sort((a, b) => a.saleAt - b.saleAt)
  }, [shows])

  const filteredSorted = useMemo(() => {
    let list = shows
    if (sourceFilter !== 'all') list = list.filter(s => s.source === sourceFilter)
    if (cityFilter !== 'all') list = list.filter(s => s.venue?.city === cityFilter)
    const withDist = list.map(s => ({ ...s, _dist: s.venue?.latitude != null && s.venue?.longitude != null ? haversineMi(location, { latitude: s.venue.latitude, longitude: s.venue.longitude }) : Infinity }))
    withDist.sort((a, b) => {
      if (sort === 'date') return new Date(a.date).getTime() - new Date(b.date).getTime()
      if (sort === 'artist') return a.artistName.localeCompare(b.artistName)
      if (sort === 'price') return (a.priceRange?.min ?? Infinity) - (b.priceRange?.min ?? Infinity)
      if (sort === 'distance') return a._dist - b._dist
      if (sort === 'relevance') {
        const ar = artistScore.get(a.artistName.toLowerCase()) ?? 999
        const br = artistScore.get(b.artistName.toLowerCase()) ?? 999
        if (ar !== br) return ar - br
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      return 0
    })
    return withDist
  }, [shows, sort, sourceFilter, cityFilter, location, artistScore])

  const total = filteredSorted.length
  const pageShows = filteredSorted.slice(0, page * PAGE_SIZE)
  const hasMore = total > pageShows.length

  // Group by the active sort key so section labels match what the user is sorting by.
  const grouped = useMemo(() => {
    type Item = typeof pageShows[number]
    const buckets: { key: string; label: string; items: Item[] }[] = []
    const indexOf: { [k: string]: number } = {}
    function push(key: string, label: string, s: Item) {
      if (key in indexOf) buckets[indexOf[key]].items.push(s)
      else { indexOf[key] = buckets.length; buckets.push({ key, label, items: [s] }) }
    }
    for (const s of pageShows) {
      if (sort === 'artist') {
        push(s.artistName.toLowerCase(), s.artistName, s)
      } else if (sort === 'price') {
        const p = s.priceRange?.min
        const key = p == null ? 'no-price' : p < 30 ? 'under-30' : p < 60 ? '30-60' : p < 100 ? '60-100' : p < 200 ? '100-200' : '200+'
        const label = p == null ? 'Price TBA' : key === 'under-30' ? 'Under $30' : key === '30-60' ? '$30 – $60' : key === '60-100' ? '$60 – $100' : key === '100-200' ? '$100 – $200' : '$200+'
        push(key, label, s)
      } else if (sort === 'distance') {
        const d = (s as any)._dist ?? Infinity
        const key = !isFinite(d) ? 'far' : d < 50 ? 'under-50' : d < 100 ? '50-100' : d < 200 ? '100-200' : d < 400 ? '200-400' : '400+'
        const label = key === 'under-50' ? 'Under 50 mi' : key === '50-100' ? '50 – 100 mi' : key === '100-200' ? '100 – 200 mi' : key === '200-400' ? '200 – 400 mi' : key === '400+' ? '400+ mi' : 'Distance unknown'
        push(key, label, s)
      } else if (sort === 'relevance') {
        // Group by artist since relevance = artist rank.
        push(s.artistName.toLowerCase(), s.artistName, s)
      } else {
        // Default: by date
        const d = new Date(s.date)
        const key = d.toDateString()
        push(key, d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }), s)
      }
    }
    return buckets
  }, [pageShows, sort])

  const filtersOpen = sourceFilter !== 'all' || cityFilter !== 'all' || sort !== 'date'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 120 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8, animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <div>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 4 }}>Shows</h1>
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>
              {total} {total === 1 ? 'show' : 'shows'} near {location.city}{hubs.length > 1 ? ` +${hubs.length - 1}` : ''}
            </p>
          </div>
          <button onClick={refresh} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Refresh</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Sort by</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([['date','Date'],['artist','Artist'],['price','Price'],['distance','Distance'],['relevance','Relevance']] as [SortKey, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setSort(val)} className={sort === val ? 'chip active' : 'chip'}>{label}</button>
              ))}
            </div>
          </div>

          <div className="divider" />

          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>Source</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(['all','bandsintown','ticketmaster','songkick'] as SourceFilter[]).map(s => (
                <button key={s} onClick={() => setSourceFilter(s)} className={sourceFilter === s ? 'chip active' : 'chip'}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
              ))}
            </div>
          </div>

          {cities.length > 1 && (
            <>
              <div className="divider" />
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>City</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => setCityFilter('all')} className={cityFilter === 'all' ? 'chip active' : 'chip'}>All</button>
                  {cities.map(c => <button key={c} onClick={() => setCityFilter(c)} className={cityFilter === c ? 'chip active' : 'chip'}>{c}</button>)}
                </div>
              </div>
            </>
          )}

          {filtersOpen && (
            <button onClick={() => { setSort('date'); setSourceFilter('all'); setCityFilter('all') }} className="btn-ghost" style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 11 }}>Clear filters</button>
          )}
        </div>

        {upcomingPresales.length > 0 && !loading && <PresaleCountdowns items={upcomingPresales} />}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 96, animationDelay: `${i * 0.05}s` }} />)}
          </div>
        ) : pageShows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)', fontFamily: 'Outfit, sans-serif', fontSize: 14 }}>
            <p>No shows found.</p>
            <p style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>Try a different location or check back later.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {grouped.map(({ key, label, items }) => (
              <section key={key}>
                <div className="section-label" style={{ marginBottom: 8, animation: 'fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
                  {label}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((s, i) => {
                    const rel = artistScore.get(s.artistName.toLowerCase())
                    const isSaved = artists.find(a => a.name.toLowerCase() === s.artistName.toLowerCase() && a.source === 'manual')
                    const isTopMatch = rel !== undefined && rel < 3
                    const link = s.ticketUrl ?? s.bandsintownUrl ?? ''
                    return (
                      <div
                        key={s.id}
                        className="card"
                        style={{
                          display: 'flex',
                          padding: 0,
                          overflow: 'hidden',
                          animation: `fadeUp 0.4s ${i * 0.03}s cubic-bezier(0.16,1,0.3,1) both`,
                        }}
                      >
                        <a
                          href={link || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            flex: 1,
                            padding: 16,
                            gap: 14,
                            textDecoration: 'none',
                            color: 'inherit',
                            minWidth: 0,
                          }}
                        >
                          <div style={{
                            width: 56, minWidth: 56, textAlign: 'center',
                            padding: '6px 0',
                            borderRight: '1px solid var(--border)',
                            fontFamily: 'Syne, sans-serif', fontWeight: 700,
                          }}>
                            <div style={{ fontSize: 20, color: 'var(--text)', lineHeight: 1 }}>
                              {new Date(s.date).getDate()}
                            </div>
                            <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>
                              {new Date(s.date).toLocaleDateString('en-US', { month: 'short' })}
                            </div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                              {isTopMatch && <span style={{ fontSize: 9, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 'var(--r-xs)', padding: '2px 6px', letterSpacing: 0.5 }}>TOP MATCH</span>}
                              {isSaved && <span style={{ fontSize: 9, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--r-xs)', padding: '1px 6px', letterSpacing: 0.5 }}>SAVED</span>}
                              <span style={{ fontSize: 9, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{s.source}</span>
                            </div>
                            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: 'var(--text)', fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{s.artistName}</p>
                            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                              {s.venue?.name}{s.venue?.city ? ` · ${s.venue.city}` : ''}
                            </p>
                            {s._dist !== Infinity && (
                              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                                {Math.round(s._dist)} mi away
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4 }}>
                            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-dim)' }}>
                              {new Date(s.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                            {s.priceRange?.min != null && s.priceRange.min > 0 && (
                              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>${Math.round(s.priceRange.min)}</span>
                            )}
                          </div>
                        </a>
                        <CopyLinkButton link={link} />
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
            {hasMore && (
              <button onClick={() => setPage(p => p + 1)} className="btn-ghost" style={{ padding: '12px 20px', fontSize: 13, alignSelf: 'center' }}>
                Show {Math.min(PAGE_SIZE, total - pageShows.length)} more
              </button>
            )}
          </div>
        )}
      </div>

      <NavDock />
    </div>
  )
}

function PresaleCountdowns({ items }: { items: { show: Show; saleAt: number; saleName: string }[] }) {
  return (
    <section style={{ marginBottom: 24, animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span className="section-label">Presales & onsales</span>
        <span style={{ fontSize: 9, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 'var(--r-xs)', padding: '2px 6px', letterSpacing: 0.5 }}>LIVE</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <PresaleCard key={`${it.show.id}-${it.saleName}-${it.saleAt}`} show={it.show} saleAt={it.saleAt} saleName={it.saleName} index={i} />
        ))}
      </div>
      <div className="divider" style={{ marginTop: 24 }} />
    </section>
  )
}

function PresaleCard({ show, saleAt, saleName, index }: { show: Show; saleAt: number; saleName: string; index: number }) {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const ms = Math.max(0, saleAt - now)
  const days = Math.floor(ms / (24 * 60 * 60 * 1000))
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000))
  const seconds = Math.floor((ms % (60 * 1000)) / 1000)
  const started = ms === 0
  const saleLocal = new Date(saleAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  return (
    <a
      href={show.ticketUrl ?? show.bandsintownUrl ?? '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="card"
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: 14,
        textDecoration: 'none', color: 'inherit',
        animation: `fadeUp 0.4s ${index * 0.05}s cubic-bezier(0.16,1,0.3,1) both`,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9, fontFamily: 'Syne, sans-serif', fontWeight: 700, letterSpacing: 0.5,
            color: started ? 'var(--bg)' : 'var(--accent)',
            background: started ? 'var(--accent)' : 'var(--accent-soft)',
            borderRadius: 'var(--r-xs)', padding: '2px 6px',
          }}>{started ? 'ON SALE NOW' : saleName.toUpperCase()}</span>
          <span style={{ fontSize: 9, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-faint)', letterSpacing: 0.5, textTransform: 'uppercase' }}>TICKETMASTER</span>
        </div>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 15, color: 'var(--text)', fontWeight: 600, marginBottom: 2, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{show.artistName}</p>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-dim)' }}>
          {show.venue?.name}{show.venue?.city ? ` · ${show.venue.city}` : ''} · {new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </p>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 10, color: 'var(--text-faint)', marginTop: 3 }}>
          {started ? 'Tickets available now' : `Opens ${saleLocal}`}
        </p>
      </div>
      {!started && (
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
          {days > 0 && <CountUnit value={days} label="d" />}
          <CountUnit value={hours} label="h" />
          <CountUnit value={minutes} label="m" />
          <CountUnit value={seconds} label="s" />
        </div>
      )}
    </a>
  )
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 30 }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {String(value).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 8, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)
  async function onCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  if (!link) return <div style={{ width: 1, borderLeft: '1px solid var(--border)' }} />
  return (
    <button
      onClick={onCopy}
      title={copied ? 'Copied!' : 'Copy ticket link'}
      aria-label="Copy ticket link"
      style={{
        width: 44, minWidth: 44,
        background: 'transparent',
        border: 'none',
        borderLeft: '1px solid var(--border)',
        color: copied ? 'var(--accent)' : 'var(--text-dim)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: 0.5,
        textTransform: 'uppercase',
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--hover)' }}
      onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent' }}
    >
      {copied ? 'OK' : 'COPY'}
    </button>
  )
}
