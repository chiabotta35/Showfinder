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
const TRACKED_KEY = 'showfinder_tracked_shows'

type SortKey = 'date' | 'artist' | 'price' | 'distance' | 'relevance'
type SourceFilter = 'all' | EventSource
type ViewMode = 'list' | 'calendar' | 'compact'

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

function loadTrackedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(TRACKED_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {}
  return new Set()
}

function saveTrackedIds(ids: Set<string>) {
  try { localStorage.setItem(TRACKED_KEY, JSON.stringify(Array.from(ids))) } catch {}
}

export default function ShowsClient({ initialLocation, initialHubs, initialArtistNames }: Props) {
  const [location, setLocation] = useState<UserLocation>(initialLocation)
  const [allHubs, setAllHubs] = useState<TouringHub[]>(initialHubs)
  const [enabledHubs, setEnabledHubs] = useState<Set<string>>(() => new Set(initialHubs.map(h => h.id)))
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
  const [dataSource, setDataSource] = useState<'cache' | 'api' | 'client' | null>(null)
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null)
  const [sort, setSort] = useState<SortKey>('date')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 25

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedShow, setSelectedShow] = useState<Show | null>(null)
  const [trackedIds, setTrackedIds] = useState<Set<string>>(() => loadTrackedIds())
  const [hubSectionOpen, setHubSectionOpen] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  })
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<number | null>(null)
  const [showTrackedOnly, setShowTrackedOnly] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    let mounted = true
    let savedLoc: any = null
    let savedHubIds: string[] = []
    try {
      const stored = localStorage.getItem('lastShowsLocation')
      if (stored) {
        savedLoc = JSON.parse(stored)
        if (savedLoc && isFinite(savedLoc.latitude) && isFinite(savedLoc.longitude) && (savedLoc.latitude !== 0 || savedLoc.longitude !== 0)) {
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
        const cur = `${savedLoc.latitude},${savedLoc.longitude}|${savedHubIds.slice().sort().join(',')}|${artistNames.slice().sort().join(',')}`
        if (Date.now() - ts < CACHE_TTL_MS && locKey === cur) {
          setShows(data.shows ?? [])
          setArtists(data.artists ?? [])
          setLoading(false)
          setDataSource('client')
          setLastFetchAt(ts)
          return
        }
      }
    } catch {}

    fetch('/api/location?lat=' + lat + '&lng=' + lng)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!mounted || !d) {
          loadShows(savedLoc, savedHubIds)
          return
        }
        const suggested: TouringHub[] = Array.isArray(d.suggestedHubs) ? d.suggestedHubs : []
        const near: TouringHub[] = Array.isArray(d.nearHubs) ? d.nearHubs : []
        if (suggested.length) {
          setAllHubs(suggested)
          const suggestedIds = new Set(suggested.map(h => h.id))
          const initialEnabled = savedHubIds.length
            ? new Set(savedHubIds.filter(id => suggestedIds.has(id)))
            : new Set(near.map(h => h.id))
          setEnabledHubs(initialEnabled)
          const hubIdsToUse = initialEnabled.size > 0 ? Array.from(initialEnabled) : near.map(h => h.id)
          loadShows(savedLoc, hubIdsToUse)
        } else {
          loadShows(savedLoc, savedHubIds)
        }
      })
      .catch(() => {
        if (mounted) loadShows(savedLoc, savedHubIds)
      })
    return () => { mounted = false }
  }, [])

  async function loadShows(savedLocOverride?: any, savedHubIdsOverride?: string[]) {
    let hubIdsToSend: string[]
    if (savedHubIdsOverride && savedHubIdsOverride.length) {
      hubIdsToSend = savedHubIdsOverride
    } else {
      const validHubIds = new Set(allHubs.map(h => h.id))
      hubIdsToSend = Array.from(enabledHubs).filter(id => validHubIds.has(id))
    }
    return loadShowsWithHubs(new Set(hubIdsToSend), savedLocOverride)
  }

  async function loadShowsWithHubs(hubIds: Set<string>, savedLocOverride?: any) {
    setLoading(true)
    const locForUrl = savedLocOverride && isFinite(savedLocOverride.latitude) ? {
      city: savedLocOverride.city, region: savedLocOverride.region, country: savedLocOverride.country || 'US',
      latitude: savedLocOverride.latitude, longitude: savedLocOverride.longitude,
    } : location
    const hubIdsToSend = Array.from(hubIds)
    const url = new URL('/api/shows', window.location.origin)
    url.searchParams.set('lat', String(locForUrl.latitude))
    url.searchParams.set('lng', String(locForUrl.longitude))
    url.searchParams.set('city', locForUrl.city)
    if (locForUrl.region) url.searchParams.set('region', locForUrl.region)
    if (hubIdsToSend.length) url.searchParams.set('hubs', hubIdsToSend.join(','))
    if (artistNames.length) url.searchParams.set('artists', artistNames.join(','))
    const res = await fetch(url.toString())
    const data = await res.json()
    setShows(data.shows ?? [])
    setArtists(data.artists ?? [])
    setLoading(false)
    setLastFetchAt(Date.now())
    setDataSource(data.fromCache ? 'cache' : 'api')
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data, locKey: `${locForUrl.latitude},${locForUrl.longitude}|${hubIdsToSend.sort().join(',')}|${artistNames.slice().sort().join(',')}` })) } catch {}
  }

  function refresh() {
    try { localStorage.removeItem(CACHE_KEY) } catch {}
    const validHubIds = new Set(allHubs.map(h => h.id))
    const next = new Set(Array.from(enabledHubs).filter(id => validHubIds.has(id)))
    loadShowsWithHubs(next)
  }

  function toggleHub(id: string) {
    const next = new Set(enabledHubs)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setEnabledHubs(next)
    try { localStorage.removeItem(CACHE_KEY) } catch {}
    setTimeout(() => loadShowsWithHubs(next), 0)
  }

  function onLocationChange(loc: UserLocation, h: TouringHub[]) {
    setLocation(loc); setAllHubs(h); setPage(1)
    const next = new Set(h.map(x => x.id))
    setEnabledHubs(next)
    try { localStorage.removeItem(CACHE_KEY) } catch {}
    setTimeout(() => loadShowsWithHubs(next), 0)
  }

  function toggleTracked(id: string) {
    const next = new Set(trackedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setTrackedIds(next)
    saveTrackedIds(next)
  }

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
    if (showTrackedOnly) list = list.filter(s => trackedIds.has(s.id))
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
  }, [shows, sort, sourceFilter, cityFilter, location, artistScore, showTrackedOnly, trackedIds])

  const total = filteredSorted.length
  const pageShows = filteredSorted.slice(0, page * PAGE_SIZE)
  const hasMore = total > pageShows.length

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
        push(s.artistName.toLowerCase(), s.artistName, s)
      } else {
        const d = new Date(s.date)
        const key = d.toDateString()
        push(key, d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }), s)
      }
    }
    return buckets
  }, [pageShows, sort])

  const filtersOpen = sourceFilter !== 'all' || cityFilter !== 'all' || sort !== 'date' || showTrackedOnly

  const calendarShows = useMemo(() => {
    const map = new Map<number, typeof filteredSorted[number][]>()
    for (const s of filteredSorted) {
      const d = new Date(s.date)
      if (d.getFullYear() === calendarMonth.year && d.getMonth() === calendarMonth.month) {
        const day = d.getDate()
        if (!map.has(day)) map.set(day, [])
        map.get(day)!.push(s)
      }
    }
    return map
  }, [filteredSorted, calendarMonth])

  const calendarDaysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate()
  const calendarStartDow = new Date(calendarMonth.year, calendarMonth.month, 1).getDay()
  const today = new Date()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 120 }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px 20px' }}>
        <div className="page-header" style={{ padding: 0, marginBottom: 16, animation: 'fadeUp 0.5s var(--ease-out)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 0 }}>Shows</h1>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: 'var(--text-muted)' }}>
              {total} {total === 1 ? 'show' : 'shows'}
            </span>
            {dataSource && lastFetchAt && (
              <StatusDot source={dataSource} ts={lastFetchAt} />
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={refresh} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Refresh</button>
            </div>
          </div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            near {location.city}{enabledHubs.size > 1 ? ` +${enabledHubs.size - 1}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />
          <SortChips sort={sort} onChange={setSort} />
          <SourceChips source={sourceFilter} onChange={setSourceFilter} />
          {cities.length > 1 && <CityChips cities={cities} active={cityFilter} onChange={setCityFilter} />}
          <button
            onClick={() => setShowTrackedOnly(v => !v)}
            className={showTrackedOnly ? 'chip chip-shows active' : 'chip'}
            style={{ flexShrink: 0 }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill={showTrackedOnly ? 'var(--shows-primary)' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Tracked
          </button>
          {filtersOpen && (
            <button onClick={() => { setSort('date'); setSourceFilter('all'); setCityFilter('all'); setShowTrackedOnly(false) }} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 11, flexShrink: 0 }}>Clear</button>
          )}
        </div>

        {allHubs.length > 0 && (
          <HubToggle
            hubs={allHubs}
            enabled={enabledHubs}
            onToggle={toggleHub}
            onAllNone={() => {
              const next = enabledHubs.size === allHubs.length
                ? new Set<string>()
                : new Set(allHubs.map(h => h.id))
              setEnabledHubs(next)
              try { localStorage.removeItem(CACHE_KEY) } catch {}
              setTimeout(() => loadShowsWithHubs(next), 0)
            }}
            open={hubSectionOpen}
            onToggleOpen={() => setHubSectionOpen(v => !v)}
          />
        )}

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
        ) : viewMode === 'calendar' ? (
          <CalendarView
            shows={filteredSorted}
            calendarMonth={calendarMonth}
            setCalendarMonth={setCalendarMonth}
            calendarDaysInMonth={calendarDaysInMonth}
            calendarStartDow={calendarStartDow}
            calendarShows={calendarShows}
            calendarSelectedDay={calendarSelectedDay}
            setCalendarSelectedDay={setCalendarSelectedDay}
            today={today}
            artistScore={artistScore}
            trackedIds={trackedIds}
            onToggleTracked={toggleTracked}
            onSelectVenue={setSelectedShow}
          />
        ) : viewMode === 'compact' ? (
          <CompactView
            shows={pageShows}
            artistScore={artistScore}
            trackedIds={trackedIds}
            onToggleTracked={toggleTracked}
            onSelectVenue={setSelectedShow}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {grouped.map(({ key, label, items }) => (
              <section key={key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, animation: 'fadeUp 0.4s var(--ease-out)' }}>
                  <div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--shows-primary)', flexShrink: 0 }} />
                  <div className="section-label">{label}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {items.map((s, i) => (
                    <ShowCard
                      key={s.id}
                      show={s}
                      index={i}
                      artistScore={artistScore}
                      artists={artists}
                      trackedIds={trackedIds}
                      onToggleTracked={toggleTracked}
                      onSelectVenue={setSelectedShow}
                    />
                  ))}
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

      {selectedShow && (
        <VenuePanel show={selectedShow} onClose={() => setSelectedShow(null)} />
      )}

      <NavDock />
    </div>
  )
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  const options: { value: ViewMode; label: string; icon: JSX.Element }[] = [
    { value: 'list', label: 'List', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg> },
    { value: 'calendar', label: 'Cal', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg> },
    { value: 'compact', label: 'Dense', icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 5h18M3 12h18M3 19h18"/></svg> },
  ]
  return (
    <div style={{ display: 'flex', gap: 2, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-full)', padding: 2, flexShrink: 0 }}>
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', fontSize: 11, fontFamily: 'Outfit, sans-serif', fontWeight: 500,
            borderRadius: 'var(--r-full)', border: 'none', cursor: 'pointer',
            background: mode === o.value ? 'var(--shows-soft)' : 'transparent',
            color: mode === o.value ? 'var(--shows-primary)' : 'var(--text-dim)',
            transition: 'all 0.15s',
          }}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SortChips({ sort, onChange }: { sort: SortKey; onChange: (s: SortKey) => void }) {
  const opts: [SortKey, string][] = [['date', 'Date'], ['artist', 'Artist'], ['price', 'Price'], ['distance', 'Distance'], ['relevance', 'Relevance']]
  return (
    <>
      {opts.map(([val, label]) => (
        <button key={val} onClick={() => onChange(val)} className={sort === val ? 'chip chip-shows active' : 'chip'} style={{ flexShrink: 0 }}>{label}</button>
      ))}
    </>
  )
}

function SourceChips({ source, onChange }: { source: SourceFilter; onChange: (s: SourceFilter) => void }) {
  const opts = ['all', 'bandsintown', 'ticketmaster', 'songkick'] as SourceFilter[]
  return (
    <>
      {opts.map(s => (
        <button key={s} onClick={() => onChange(s)} className={source === s ? 'chip chip-shows active' : 'chip'} style={{ flexShrink: 0 }}>
          {s === 'all' ? 'All sources' : s === 'bandsintown' ? 'BIT' : s === 'ticketmaster' ? 'TM' : 'Songkick'}
        </button>
      ))}
    </>
  )
}

function CityChips({ cities, active, onChange }: { cities: string[]; active: string; onChange: (c: string) => void }) {
  return (
    <>
      {cities.map(c => (
        <button key={c} onClick={() => onChange(c)} className={active === c ? 'chip chip-shows active' : 'chip'} style={{ flexShrink: 0 }}>{c}</button>
      ))}
    </>
  )
}

function HubToggle({ hubs, enabled, onToggle, onAllNone, open, onToggleOpen }: {
  hubs: TouringHub[]
  enabled: Set<string>
  onToggle: (id: string) => void
  onAllNone: () => void
  open: boolean
  onToggleOpen: () => void
}) {
  return (
    <div style={{ marginBottom: 20, animation: 'fadeUp 0.4s var(--ease-out)' }}>
      <button
        onClick={onToggleOpen}
        className="btn-ghost"
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'space-between',
          padding: '8px 14px', fontSize: 12, fontFamily: 'Outfit, sans-serif',
        }}
      >
        <span style={{ color: 'var(--text-secondary)' }}>
          Tour hubs · <span style={{ color: 'var(--shows-primary)', fontWeight: 600 }}>{enabled.size}/{hubs.length}</span> enabled
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              onClick={onAllNone}
              className="btn-ghost"
              style={{ padding: '3px 8px', fontSize: 10, fontFamily: 'Syne, sans-serif', fontWeight: 700 }}
            >
              {enabled.size === hubs.length ? 'None' : 'All'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {hubs.map(h => (
              <button
                key={h.id}
                onClick={() => onToggle(h.id)}
                className={enabled.has(h.id) ? 'chip chip-shows active' : 'chip'}
                style={{ opacity: enabled.has(h.id) ? 1 : 0.45 }}
                title={`${h.name} · ${h.region}${h.distanceMiles != null ? ` · ${h.distanceMiles} mi` : ''}`}
              >
                {h.name.replace(/, [A-Z]{2}$/, '')}
                {h.distanceMiles != null && (
                  <span style={{ marginLeft: 4, opacity: 0.7, fontSize: 9, fontFamily: 'Outfit, sans-serif' }}>{h.distanceMiles}mi</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ShowCard({ show, index, artistScore, artists, trackedIds, onToggleTracked, onSelectVenue }: {
  show: (Show & { _dist?: number })
  index: number
  artistScore: Map<string, number>
  artists: ScoredArtist[]
  trackedIds: Set<string>
  onToggleTracked: (id: string) => void
  onSelectVenue: (show: Show) => void
}) {
  const s = show
  const rel = artistScore.get(s.artistName.toLowerCase())
  const isSaved = artists.find(a => a.name.toLowerCase() === s.artistName.toLowerCase() && a.source === 'manual')
  const isTopMatch = rel !== undefined && rel < 3
  const isTracked = trackedIds.has(s.id)
  const link = s.ticketUrl ?? s.bandsintownUrl ?? ''

  return (
    <div
      className="card interactive"
      style={{
        display: 'flex',
        padding: 0,
        overflow: 'hidden',
        animation: `fadeUp 0.4s ${index * 0.03}s var(--ease-out) both`,
        borderLeft: isTracked ? '3px solid var(--shows-primary)' : undefined,
      }}
    >
      <a
        href={link || '#'}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          flex: 1,
          padding: '16px 16px',
          gap: 14,
          textDecoration: 'none',
          color: 'inherit',
          minWidth: 0,
        }}
      >
        <div style={{
          width: 56, minWidth: 56, textAlign: 'center',
          padding: '8px 0',
          borderRight: '1px solid var(--border)',
          fontFamily: 'Syne, sans-serif', fontWeight: 700,
        }}>
          <div style={{ fontSize: 22, color: 'var(--text)', lineHeight: 1 }}>
            {new Date(s.date).getDate()}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>
            {new Date(s.date).toLocaleDateString('en-US', { month: 'short' })}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
            {isTopMatch && <span className="badge" style={{ color: 'var(--shows-primary)', background: 'var(--shows-soft)' }}>TOP MATCH</span>}
            {isSaved && <span className="badge" style={{ color: 'var(--shows-primary)', border: '1px solid var(--shows-primary)', background: 'transparent' }}>SAVED</span>}
            <span className="badge" style={{ color: 'var(--text-faint)', background: 'transparent' }}>{s.source === 'bandsintown' ? 'BIT' : s.source === 'ticketmaster' ? 'TM' : s.source}</span>
          </div>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: 'var(--text)', fontWeight: 600, marginBottom: 4, lineHeight: 1.3 }}>{s.artistName}</p>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelectVenue(s) }}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-muted)',
              textAlign: 'left', lineHeight: 1.4,
            }}
          >
            {s.venue?.name}{s.venue?.city ? ` · ${s.venue.city}` : ''}
          </button>
          {s._dist != null && isFinite(s._dist) && (
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
      <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)' }}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleTracked(s.id) }}
          title={isTracked ? 'Stop tracking' : 'Track price'}
          aria-label={isTracked ? 'Stop tracking' : 'Track price'}
          style={{
            width: 40, height: 40,
            background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)',
            color: isTracked ? 'var(--shows-primary)' : 'var(--text-dim)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'color 0.15s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isTracked ? 'var(--shows-primary)' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
        <ShareButton show={s} link={link} />
      </div>
    </div>
  )
}

function CalendarView({ shows, calendarMonth, setCalendarMonth, calendarDaysInMonth, calendarStartDow, calendarShows, calendarSelectedDay, setCalendarSelectedDay, today, artistScore, trackedIds, onToggleTracked, onSelectVenue }: {
  shows: (Show & { _dist?: number })[]
  calendarMonth: { year: number; month: number }
  setCalendarMonth: (fn: (m: { year: number; month: number }) => { year: number; month: number }) => void
  calendarDaysInMonth: number
  calendarStartDow: number
  calendarShows: Map<number, (Show & { _dist?: number })[]>
  calendarSelectedDay: number | null
  setCalendarSelectedDay: (d: number | null) => void
  today: Date
  artistScore: Map<string, number>
  trackedIds: Set<string>
  onToggleTracked: (id: string) => void
  onSelectVenue: (show: Show) => void
}) {
  const monthName = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const cells: (number | null)[] = []
  for (let i = 0; i < calendarStartDow; i++) cells.push(null)
  for (let d = 1; d <= calendarDaysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedShows = calendarSelectedDay != null ? calendarShows.get(calendarSelectedDay) ?? [] : []

  return (
    <div style={{ animation: 'fadeUp 0.4s var(--ease-out)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button onClick={() => setCalendarMonth(m => {
          const nm = m.month - 1
          return nm < 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: nm }
        })} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{monthName}</span>
        <button onClick={() => setCalendarMonth(m => {
          const nm = m.month + 1
          return nm > 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: nm }
        })} className="btn-ghost" style={{ padding: '6px 10px', fontSize: 12 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase', padding: '6px 0' }}>{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={`empty-${i}`} />
          const dayShows = calendarShows.get(day) ?? []
          const isToday = today.getFullYear() === calendarMonth.year && today.getMonth() === calendarMonth.month && today.getDate() === day
          const isSelected = calendarSelectedDay === day
          const hasShows = dayShows.length > 0
          return (
            <button
              key={day}
              onClick={() => setCalendarSelectedDay(isSelected ? null : day)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '8px 2px',
                borderRadius: 'var(--r-sm)',
                border: isToday ? '2px solid var(--shows-primary)' : isSelected ? '2px solid var(--text-dim)' : '2px solid transparent',
                background: isToday ? 'var(--shows-soft)' : isSelected ? 'var(--surface-2)' : 'transparent',
                color: hasShows ? 'var(--text)' : 'var(--text-faint)',
                cursor: hasShows ? 'pointer' : 'default',
                fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: isToday ? 700 : 400,
                transition: 'all 0.15s',
              }}
            >
              <span>{day}</span>
              {hasShows && (
                <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                  {dayShows.slice(0, 3).map((s, j) => (
                    <span key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--shows-primary)' }} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {calendarSelectedDay != null && selectedShows.length > 0 && (
        <div style={{ marginTop: 8, animation: 'slideUp 0.3s var(--ease-out)' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>
            {new Date(calendarMonth.year, calendarMonth.month, calendarSelectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · {selectedShows.length} show{selectedShows.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedShows.map((s, i) => (
              <ShowCard key={s.id} show={s} index={i} artistScore={artistScore} artists={[]} trackedIds={trackedIds} onToggleTracked={onToggleTracked} onSelectVenue={onSelectVenue} />
            ))}
          </div>
        </div>
      )}
      {calendarSelectedDay != null && selectedShows.length === 0 && (
        <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-dim)', fontFamily: 'Outfit, sans-serif', fontSize: 13 }}>
          No shows on this day.
        </p>
      )}
    </div>
  )
}

function CompactView({ shows, artistScore, trackedIds, onToggleTracked, onSelectVenue }: {
  shows: (Show & { _dist?: number })[]
  artistScore: Map<string, number>
  trackedIds: Set<string>
  onToggleTracked: (id: string) => void
  onSelectVenue: (show: Show) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, animation: 'fadeUp 0.4s var(--ease-out)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px 60px 60px 80px', gap: 8, padding: '6px 12px', fontSize: 10, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: 1, textTransform: 'uppercase' }}>
        <span>Artist</span>
        <span>Venue</span>
        <span>Date</span>
        <span style={{ textAlign: 'right' }}>Price</span>
        <span style={{ textAlign: 'right' }}>Dist</span>
        <span style={{ textAlign: 'right' }}>Actions</span>
      </div>
      {shows.map((s, i) => {
        const isTracked = trackedIds.has(s.id)
        const link = s.ticketUrl ?? s.bandsintownUrl ?? ''
        return (
          <div
            key={s.id}
            className="card"
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 90px 60px 60px 80px', gap: 8,
              padding: '8px 12px', alignItems: 'center',
              borderLeft: isTracked ? '3px solid var(--shows-primary)' : undefined,
              animation: `fadeUp 0.3s ${i * 0.02}s var(--ease-out) both`,
              borderRadius: 'var(--r-sm)',
            }}
          >
            <a href={link || '#'} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'var(--text)', fontSize: 13, fontWeight: 500, fontFamily: 'Outfit, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.artistName}
            </a>
            <button
              onClick={() => onSelectVenue(s)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-muted)',
                textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {s.venue?.name ?? '—'}
            </button>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-secondary)' }}>
              {new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 700, color: 'var(--text)', textAlign: 'right' }}>
              {s.priceRange?.min != null && s.priceRange.min > 0 ? `$${Math.round(s.priceRange.min)}` : '—'}
            </span>
            <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-dim)', textAlign: 'right' }}>
              {s._dist != null && isFinite(s._dist) ? `${Math.round(s._dist)}mi` : '—'}
            </span>
            <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <button
                onClick={() => onToggleTracked(s.id)}
                style={{
                  width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer',
                  color: isTracked ? 'var(--shows-primary)' : 'var(--text-dim)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill={isTracked ? 'var(--shows-primary)' : 'none'} stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              </button>
              <ShareButton show={s} link={link} small />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ShareButton({ show, link, small }: { show: Show; link: string; small?: boolean }) {
  const [copied, setCopied] = useState(false)
  async function onCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!link) return
    const text = `${show.artistName} at ${show.venue?.name ?? 'TBA'}, ${show.venue?.city ?? ''} — ${new Date(show.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${new Date(show.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — ${link}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }
  if (small) {
    return (
      <button
        onClick={onCopy}
        title={copied ? 'Copied!' : 'Share'}
        style={{
          width: 28, height: 28, background: 'none', border: 'none', cursor: 'pointer',
          color: copied ? 'var(--shows-primary)' : 'var(--text-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
      </button>
    )
  }
  return (
    <button
      onClick={onCopy}
      title={copied ? 'Copied!' : 'Share'}
      aria-label="Share"
      style={{
        flex: 1,
        background: 'transparent',
        border: 'none',
        color: copied ? 'var(--shows-primary)' : 'var(--text-dim)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
        textTransform: 'uppercase',
        transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--hover)' }}
      onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.background = 'transparent' }}
    >
      {copied ? 'OK' : 'SHARE'}
    </button>
  )
}

function VenuePanel({ show, onClose }: { show: Show; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        animation: 'slideUp 0.3s var(--ease-out)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div
        className="panel"
        style={{
          position: 'relative',
          maxWidth: 720, margin: '0 auto',
          padding: '24px 24px 40px',
          maxHeight: '60vh', overflowY: 'auto',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: 'var(--r-full)',
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 20, color: 'var(--text)', marginBottom: 4 }}>
          {show.venue?.name ?? 'Venue'}
        </h3>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: 'var(--text-secondary)', marginBottom: 2 }}>
          {show.venue?.city}{show.venue?.region ? `, ${show.venue.region}` : ''}
        </p>
        {show.venue?.address && (
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>
            {show.venue.address}
          </p>
        )}

        {(show.ticketUrl || show.bandsintownUrl) && (
          <a
            href={show.ticketUrl ?? show.bandsintownUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
            style={{
              display: 'inline-block', padding: '10px 20px', fontSize: 13, textDecoration: 'none',
              marginBottom: 20,
            }}
          >
            Get tickets
          </a>
        )}

        <div className="divider" />

        <div style={{ marginTop: 16 }}>
          <div className="section-label" style={{ marginBottom: 8 }}>Venue info</div>
          <div style={{
            padding: '16px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)',
            fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-dim)',
          }}>
            Parking, nearby hotels, and accessibility info coming soon.
          </div>
        </div>
      </div>
    </div>
  )
}

function PresaleCountdowns({ items }: { items: { show: Show; saleAt: number; saleName: string }[] }) {
  return (
    <section style={{ marginBottom: 24, animation: 'fadeUp 0.5s var(--ease-out)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--shows-primary)', flexShrink: 0 }} />
        <span className="section-label">Presales & onsales</span>
        <span className="badge" style={{ color: 'var(--shows-primary)', background: 'var(--shows-soft)' }}>LIVE</span>
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
        animation: `fadeUp 0.4s ${index * 0.05}s var(--ease-out) both`,
        borderLeft: '3px solid var(--shows-primary)',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
          <span className="badge" style={{
            color: started ? 'var(--bg)' : 'var(--shows-primary)',
            background: started ? 'var(--shows-primary)' : 'var(--shows-soft)',
          }}>{started ? 'ON SALE NOW' : saleName.toUpperCase()}</span>
          <span className="badge" style={{ color: 'var(--text-faint)', background: 'transparent' }}>{show.source === 'bandsintown' ? 'BIT' : show.source === 'ticketmaster' ? 'TM' : show.source}</span>
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

function StatusDot({ source, ts }: { source: 'cache' | 'api' | 'client'; ts: number }) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force(x => x + 1), 30_000)
    return () => clearInterval(id)
  }, [])
  const ageMin = Math.max(0, Math.floor((Date.now() - ts) / 60_000))
  const ageStr = ageMin < 1 ? 'just now' : ageMin < 60 ? `${ageMin}m ago` : `${Math.floor(ageMin / 60)}h ago`
  const color = source === 'api' ? 'var(--shows-primary)' : source === 'cache' ? '#f59e0b' : 'var(--text-dim)'
  const label = source === 'api' ? 'Live' : source === 'cache' ? 'Server cache' : 'Local cache'
  const tooltip = `${label} · ${ageStr} · ${new Date(ts).toLocaleTimeString()}`
  const live = source === 'api'
  return (
    <span
      title={tooltip}
      style={{
        width: 8, height: 8, borderRadius: '50%',
        background: color,
        boxShadow: live ? `0 0 8px ${color}` : 'none',
        cursor: 'default',
        flexShrink: 0,
        animation: live ? 'pulse-dot 2s ease-in-out infinite' : 'none',
        display: 'inline-block',
      }}
    />
  )
}
