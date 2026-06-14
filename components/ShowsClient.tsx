'use client'
import { useState, useEffect, useMemo } from 'react'
import Shell from './Shell'
import { useSettings } from './SettingsContext'
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

const SORTS = [
  { value: 'date', label: 'Date' },
  { value: 'artist', label: 'Artist' },
  { value: 'price', label: 'Price' },
  { value: 'distance', label: 'Distance' },
  { value: 'relevance', label: 'Relevance' },
]

const SOURCES: Record<string, { label: string; short: string; color: string }> = {
  ticketmaster: { label: 'Ticketmaster', short: 'TM', color: '#5a7dff' },
  bandsintown: { label: 'Bandsintown', short: 'BIT', color: '#22c993' },
  songkick: { label: 'Songkick', short: 'SK', color: '#ff5a5f' },
}

function Countdown({ target }: { target: string }) {
  const [mounted, setMounted] = useState(false)
  const [, force] = useState(0)
  useEffect(() => { setMounted(true); const id = setInterval(() => force(x => x + 1), 1000); return () => clearInterval(id) }, [])
  if (!mounted) return <span className="cd-compact">…</span>
  const diff = new Date(target).getTime() - Date.now()
  if (diff <= 0) return <span className="cd-compact" style={{ color: '#3ddc91' }}>On sale</span>
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  if (d > 0) return <span className="cd-compact">{d}d {h}h {m}m</span>
  if (h > 0) return <span className="cd-compact">{h}h {m}m {s}s</span>
  return <span className="cd-compact">{m}m {s}s</span>
}

function haversineMi(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const R = 3959
  const dLat = (b.latitude - a.latitude) * Math.PI / 180
  const dLng = (b.longitude - a.longitude) * Math.PI / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * Math.PI / 180) * Math.cos(b.latitude * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function fmtDow(d: string) { return new Date(d).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() }
function fmtMon(d: string) { return new Date(d).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() }
function fmtDay(d: string) { return new Date(d).getDate() }
function fmtTime(d: string) {
  const dt = new Date(d); let h = dt.getHours(); const m = dt.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

function SourceBadge({ source }: { source: string }) {
  const s = SOURCES[source]
  if (!s) return null
  return <span className="src-badge" style={{ color: s.color, borderColor: s.color + '55', background: s.color + '14' }}>{s.short}</span>
}

function StatusDot({ source, ts }: { source: 'cache' | 'api' | 'client' | null; ts: number | null }) {
  const [mounted, setMounted] = useState(false)
  const [, force] = useState(0)
  useEffect(() => { setMounted(true); const id = setInterval(() => force(x => x + 1), 30_000); return () => clearInterval(id) }, [])
  if (!ts) return null
  const color = source === 'api' ? '#3ddc91' : source === 'cache' ? '#f5a623' : 'var(--faint)'
  return <span className="status-dot" style={{ background: color }} title={source === 'api' ? 'Live' : source === 'cache' ? 'Cached' : 'Local cache'} />
}

export default function ShowsClient({ initialLocation, initialHubs, initialArtistNames }: Props) {
  const { settings, toggleTrackedEvent } = useSettings()
  const [location, setLocation] = useState<UserLocation>(initialLocation)
  const [allHubs, setAllHubs] = useState<TouringHub[]>(initialHubs)
  const [enabledHubs, setEnabledHubs] = useState<Set<string>>(() => new Set(initialHubs.map(h => h.id)))
  const [focusArtist] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      const focus = localStorage.getItem('lastShowsFocusArtist')
      if (focus) { localStorage.removeItem('lastShowsFocusArtist'); return focus }
    } catch {}
    return null
  })
  const [pickedArtists, setPickedArtists] = useState<string[]>(() => {
    if (focusArtist) return [focusArtist]
    if (initialArtistNames.length) return initialArtistNames
    if (typeof window === 'undefined') return []
    try { const s = localStorage.getItem('lastShowsArtists'); if (s) return JSON.parse(s) } catch {}
    return []
  })
  const [artistPool] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try { const s = localStorage.getItem('lastShowsArtists'); if (s) return JSON.parse(s) } catch {}
    return []
  })
  const [prePageDone, setPrePageDone] = useState(!!focusArtist || initialArtistNames.length > 0)
  const [prePageQuery, setPrePageQuery] = useState('')
  const [shows, setShows] = useState<Show[]>([])
  const [artists, setArtists] = useState<ScoredArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'cache' | 'api' | 'client' | null>(null)
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null)
  const [sort, setSort] = useState<SortKey>('date')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (!prePageDone || pickedArtists.length === 0) { setLoading(false); return }
    if (typeof window === 'undefined') return
    let mounted = true
    let savedLoc: any = null
    let savedHubIds: string[] = []
    try {
      const stored = localStorage.getItem('lastShowsLocation')
      if (stored) {
        savedLoc = JSON.parse(stored)
        if (savedLoc && isFinite(savedLoc.latitude) && isFinite(savedLoc.longitude)) {
          setLocation({ city: savedLoc.city, region: savedLoc.region, country: savedLoc.country || 'US', latitude: savedLoc.latitude, longitude: savedLoc.longitude })
          if (Array.isArray(savedLoc.hubs)) savedHubIds = savedLoc.hubs
        }
      }
    } catch {}
    const lat = savedLoc?.latitude ?? initialLocation.latitude
    const lng = savedLoc?.longitude ?? initialLocation.longitude

    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw && savedLoc) {
        const { ts, data, locKey } = JSON.parse(raw)
        const cur = `${savedLoc.latitude},${savedLoc.longitude}|${savedHubIds.slice().sort().join(',')}|${pickedArtists.slice().sort().join(',')}`
        if (Date.now() - ts < CACHE_TTL_MS && locKey === cur) {
          setShows(data.shows ?? []); setArtists(data.artists ?? []); setLoading(false); setDataSource('client'); setLastFetchAt(ts); return
        }
      }
    } catch {}

    fetch('/api/location?lat=' + lat + '&lng=' + lng)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!mounted || !d) { loadShows(savedLoc, []); return }
        const suggested: TouringHub[] = Array.isArray(d.suggestedHubs) ? d.suggestedHubs : []
        const near: TouringHub[] = Array.isArray(d.nearHubs) ? d.nearHubs : []
        if (suggested.length) {
          setAllHubs(suggested)
          const nearIds = new Set(near.map(h => h.id))
          const initialEnabled = savedHubIds.length ? new Set(savedHubIds.filter(id => nearIds.has(id))) : new Set(near.map(h => h.id))
          setEnabledHubs(initialEnabled)
          loadShows(savedLoc, initialEnabled.size > 0 ? Array.from(initialEnabled) : near.map(h => h.id))
        } else {
          loadShows(savedLoc, near.map(h => h.id))
        }
      })
      .catch(() => { if (mounted) loadShows(savedLoc, []) })
    return () => { mounted = false }
  }, [prePageDone, pickedArtists])

  async function loadShows(savedLocOverride?: any, savedHubIdsOverride?: string[]) {
    let hubIdsToSend: string[]
    if (savedHubIdsOverride && savedHubIdsOverride.length) { hubIdsToSend = savedHubIdsOverride }
    else { const valid = new Set(allHubs.map(h => h.id)); hubIdsToSend = Array.from(enabledHubs).filter(id => valid.has(id)) }
    setLoading(true)
    const loc = savedLocOverride && isFinite(savedLocOverride.latitude) ? { latitude: savedLocOverride.latitude, longitude: savedLocOverride.longitude, city: savedLocOverride.city, region: savedLocOverride.region, country: savedLocOverride.country || 'US' } : location
    const url = new URL('/api/shows', window.location.origin)
    url.searchParams.set('lat', String(loc.latitude)); url.searchParams.set('lng', String(loc.longitude)); url.searchParams.set('city', loc.city)
    if (loc.region) url.searchParams.set('region', loc.region)
    if (hubIdsToSend.length) url.searchParams.set('hubs', hubIdsToSend.join(','))
    if (pickedArtists.length) url.searchParams.set('artists', pickedArtists.join(','))
    const res = await fetch(url.toString())
    const data = await res.json()
    setShows(data.shows ?? []); setArtists(data.artists ?? []); setLoading(false); setLastFetchAt(Date.now())
    setDataSource(data.fromCache ? 'cache' : 'api')
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data, locKey: `${loc.latitude},${loc.longitude}|${hubIdsToSend.sort().join(',')}|${pickedArtists.slice().sort().join(',')}` })) } catch {}
  }

  function refresh() { try { localStorage.removeItem(CACHE_KEY) } catch {}; loadShows() }

  function toggleHub(id: string) {
    const next = new Set(enabledHubs); next.has(id) ? next.delete(id) : next.add(id)
    setEnabledHubs(next); try { localStorage.removeItem(CACHE_KEY) } catch {}; setTimeout(() => loadShows(), 0)
  }

  function copyLink(id: string) {
    setCopiedId(id)
    navigator.clipboard?.writeText('https://showfinder.app/s/' + id).catch(() => {})
    setTimeout(() => setCopiedId(c => c === id ? null : c), 1600)
  }

  const artistScore = useMemo(() => { const m = new Map<string, number>(); artists.forEach((a, i) => m.set(a.name.toLowerCase(), i)); return m }, [artists])
  const cities = useMemo(() => { const s = new Set<string>(); shows.forEach(show => { if (show.venue?.city) s.add(show.venue.city) }); return ['all', ...Array.from(s).sort()] }, [shows])

  let filtered = shows.filter(s => {
    if (sourceFilter !== 'all' && s.source !== sourceFilter) return false
    if (cityFilter !== 'all' && s.venue?.city !== cityFilter) return false
    return true
  })
  type ShowWithDist = Show & { _dist: number }
  const withDist: ShowWithDist[] = filtered.map(s => ({ ...s, _dist: s.venue?.latitude != null ? haversineMi(location, { latitude: s.venue.latitude, longitude: s.venue.longitude }) : Infinity }))
  const cmp: Record<SortKey, (a: any, b: any) => number> = {
    date: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    artist: (a, b) => a.artistName.localeCompare(b.artistName),
    price: (a, b) => (a.priceRange?.min ?? Infinity) - (b.priceRange?.min ?? Infinity),
    distance: (a, b) => a._dist - b._dist,
    relevance: (a, b) => { const ar = artistScore.get(a.artistName.toLowerCase()) ?? 999; const br = artistScore.get(b.artistName.toLowerCase()) ?? 999; return ar !== br ? ar - br : new Date(a.date).getTime() - new Date(b.date).getTime() },
  }
  withDist.sort(cmp[sort])

  // Grouping
  const groups: Record<string, ShowWithDist[]> = {}
  const groupKey = (s: any) => {
    if (sort === 'date') { return new Date(s.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
    if (sort === 'artist') return s.artistName
    const p = s.priceRange?.min; return p == null ? 'Price TBA' : p < 50 ? 'Under $50' : p < 80 ? '$50-$80' : '$80+'
    if (sort === 'distance') return s._dist <= 15 ? 'Near you' : s._dist <= 120 ? 'Day trip' : 'Tour hubs'
    return 'Results'
  }
  withDist.forEach(s => { const k = groupKey(s); (groups[k] = groups[k] || []).push(s) })

  const presales = shows.filter(s => s.publicOnsaleAt || (s.presales && s.presales.length > 0))

  const prePageFiltered = prePageQuery.trim()
    ? artistPool.filter(a => a.toLowerCase().includes(prePageQuery.toLowerCase()))
    : artistPool

  function startShows(names: string[]) {
    setPickedArtists(names)
    setPrePageDone(true)
  }

  if (!prePageDone) {
    return (
      <Shell route="shows">
        <div className="page shows">
          <header className="page-head">
            <h1 className="page-title">Shows</h1>
          </header>

          <section className="block">
            <div className="block-head">
              <h2 className="block-title">Find shows for</h2>
            </div>
            <button className="btn-primary" style={{ alignSelf: 'flex-start', marginBottom: 4 }}
              onClick={() => startShows(artistPool)}>
              All {artistPool.length} artists
            </button>
            <div className="artist-search" style={{ marginTop: 4 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" /></svg>
              <input value={prePageQuery} onChange={e => setPrePageQuery(e.target.value)} placeholder="Search artists…" />
            </div>
            <div className="artist-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {prePageFiltered.map(a => (
                <div key={a} className="artist-row" style={{ cursor: 'pointer' }} onClick={() => startShows([a])}>
                  <div className="ar-info">
                    <div className="ar-name">{a}</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </div>
              ))}
              {prePageFiltered.length === 0 && (
                <div className="empty"><div className="empty-sub">No artists found</div></div>
              )}
            </div>
          </section>
        </div>
      </Shell>
    )
  }

  return (
    <Shell route="shows">
      <div className="page shows">
        <header className="page-head">
          <h1 className="page-title">Shows</h1>
          <div className="head-status"><StatusDot source={dataSource} ts={lastFetchAt} />Updated</div>
        </header>

        {settings.showPresale && presales.length > 0 && (
          <section className="presale-banner">
            <div className="pb-head">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6ZM10 19a2 2 0 0 0 4 0" /></svg>
              Presales opening soon
            </div>
            <div className="pb-list">
              {presales.slice(0, 6).map(s => {
                const presaleName = s.presales && s.presales.length > 0 ? s.presales[0].name : null
                const presaleTarget = s.presales && s.presales.length > 0 ? s.presales[0].startDateTime : s.publicOnsaleAt
                return (
                  <div className="pb-row" key={s.id}>
                    <div className="pb-info">
                      <b>{s.artistName}</b>
                      <span>{presaleName ? `${presaleName} · ` : ''}{s.venue?.name}</span>
                    </div>
                    {presaleTarget && new Date(presaleTarget) > new Date() ? (
                      <Countdown target={presaleTarget} />
                    ) : (
                      <span className="cd-compact" style={{ color: '#3ddc91' }}>On sale</span>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {settings.showsFilters.sort && (
          <div className="filter-bar">
            <button className={`pill ${openFilter === 'sort' ? 'active' : ''}`} onClick={() => setOpenFilter(openFilter === 'sort' ? null : 'sort')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l-3 3M17 20l3-3" /></svg>
              <span className="pill-label">Sort: <b>{SORTS.find(x => x.value === sort)?.label}</b></span>
            </button>
            <button className={`pill ${openFilter === 'source' ? 'active' : ''}`} onClick={() => setOpenFilter(openFilter === 'source' ? null : 'source')}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5h16l-6 7v6l-4 2v-8Z" /></svg>
              <span className="pill-label">Source: <b>{sourceFilter === 'all' ? 'All' : SOURCES[sourceFilter]?.short}</b></span>
            </button>
            {cities.length > 2 && (
              <button className={`pill ${openFilter === 'city' ? 'active' : ''}`} onClick={() => setOpenFilter(openFilter === 'city' ? null : 'city')}>
                <span className="pill-label">City: <b>{cityFilter === 'all' ? 'All' : cityFilter}</b></span>
              </button>
            )}
          </div>
        )}
        {openFilter === 'sort' && (
          <div className="filter-pop">{SORTS.map(o => (
            <button key={o.value} className={`fp-opt ${sort === o.value ? 'on' : ''}`} onClick={() => { setSort(o.value as SortKey); setOpenFilter(null) }}>{o.label}{sort === o.value && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17 19 7" /></svg>}</button>
          ))}</div>
        )}
        {openFilter === 'source' && (
          <div className="filter-pop">{['all', ...Object.keys(SOURCES)].map(o => (
            <button key={o} className={`fp-opt ${sourceFilter === o ? 'on' : ''}`} onClick={() => { setSourceFilter(o as SourceFilter); setOpenFilter(null) }}>{o === 'all' ? 'All sources' : SOURCES[o]?.label}{sourceFilter === o && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17 19 7" /></svg>}</button>
          ))}</div>
        )}
        {openFilter === 'city' && (
          <div className="filter-pop">{cities.map(o => (
            <button key={o} className={`fp-opt ${cityFilter === o ? 'on' : ''}`} onClick={() => { setCityFilter(o); setOpenFilter(null) }}>{o === 'all' ? 'All cities' : o}{cityFilter === o && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17 19 7" /></svg>}</button>
          ))}</div>
        )}

        {allHubs.length > 0 && (
          <div className="hub-row">
            <span className="hub-label">Tour hubs</span>
            {allHubs.map(h => (
              <button key={h.id} className={`hub-chip ${enabledHubs.has(h.id) ? 'on' : ''}`} onClick={() => toggleHub(h.id)}
                style={enabledHubs.has(h.id) ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}>
                {h.name.split(',')[0]}{h.distanceMiles != null ? ` \u00B7 ${h.distanceMiles}mi` : ''}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 96 }} />)}
          </div>
        ) : withDist.length === 0 ? (
          <div className="empty">
            <div className="empty-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z" /></svg></div>
            <div className="empty-title">No shows match</div>
            <div className="empty-sub">Try a different source, city, or hub toggle.</div>
          </div>
        ) : (
          Object.entries(groups).map(([g, items]) => (
            <section className="show-group" key={g}>
              <div className="group-label">{g}<span>{items.length}</span></div>
              <div className="show-list">
                {items.map(s => {
                  const isTracked = settings.trackedEvents.some(t => t.id === s.id)
                  const link = s.ticketUrl ?? ''
                  return (
                    <div key={s.id} className={`show-card ${settings.showsCardLayout}`}>
                      <div className="date-block">
                        <span className="db-dow">{fmtDow(s.date)}</span>
                        <span className="db-day">{fmtDay(s.date)}</span>
                        <span className="db-mon">{fmtMon(s.date)}</span>
                      </div>
                      <div className="show-main">
                        <div className="show-top">
                          <h3 className="show-artist">{s.artistName}</h3>
                          <button className={`star-btn ${isTracked ? 'on' : ''}`} onClick={() => toggleTrackedEvent({ id: s.id, artistName: s.artistName, date: s.date, venueName: s.venue?.name, venueCity: s.venue?.city, ticketUrl: s.ticketUrl })} title={isTracked ? 'Unstar' : 'Star'}>
                            <svg width={settings.showsCardLayout === 'compact' ? 17 : 19} height={settings.showsCardLayout === 'compact' ? 17 : 19} viewBox="0 0 24 24" fill={isTracked ? 'var(--sec-tracked)' : 'none'} stroke={isTracked ? 'var(--sec-tracked)' : 'var(--faint)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                          </button>
                        </div>
                        <div className="show-venue">{s.venue?.name}{s.venue?.city ? ` \u00B7 ${s.venue.city}` : ''}</div>
                        <div className="show-meta">
                          {s._dist !== Infinity && <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" /></svg>{Math.round(s._dist)}mi</span>}
                          <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l3 2" /></svg>{fmtTime(s.date)}</span>
                          {s.priceRange?.min != null && s.priceRange.min > 0 && <span className="show-price">${Math.round(s.priceRange.min)}</span>}
                          {settings.showsCardLayout !== 'compact' && <SourceBadge source={s.source} />}
                        </div>
                        {settings.showsCardLayout !== 'compact' && (
                          <div className="show-actions">
                            <button className="ghost-btn" onClick={() => copyLink(s.id)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l6-6M8 8H6.5a3.5 3.5 0 0 0 0 7H9M15 16h1.5a3.5 3.5 0 0 0 0-7H15" /></svg>
                              {copiedId === s.id ? 'Copied' : 'Copy link'}
                            </button>
                            {link && <a href={link} target="_blank" rel="noopener noreferrer" className="tix-btn">Tickets <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></svg></a>}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </Shell>
  )
}
