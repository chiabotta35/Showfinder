'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSettings } from '@/components/SettingsContext'

interface Show {
  id?: string
  artistName: string
  eventDate: string
  venue?: { name?: string; city?: string; latitude?: number; longitude?: number }
  priceRange?: { min?: number }
  ticketUrl?: string
  publicOnsaleAt?: string
  presales?: { type: string; date: string }[]
}

export default function TrackedClient({ savedArtistNames }: { savedArtistNames: string[] }) {
  const { settings, toggleTrackedArtist } = useSettings()
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)

  // Merge server-side saved artists with settings tracked artists
  const trackedArtists = [...new Set([...savedArtistNames, ...settings.trackedArtists])]

  // Fetch shows for tracked artists
  const fetchShows = useCallback(async () => {
    if (trackedArtists.length === 0) { setShows([]); return }
    setLoading(true)
    try {
      const res = await fetch('/api/shows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artists: trackedArtists }),
      })
      const data = await res.json()
      if (data.shows) setShows(data.shows)
    } catch (e) { console.error('Failed to fetch tracked shows', e) }
    setLoading(false)
  }, [trackedArtists.join(',')])

  useEffect(() => { fetchShows() }, [fetchShows])

  // Generate iCal
  const downloadCalendar = () => {
    const now = new Date()
    const cal = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ShowFinder//Tracked//EN',
      `X-WR-CALNAME:ShowFinder Shows`,
    ]
    shows.forEach((s, i) => {
      const dt = new Date(s.eventDate)
      const dtStart = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const dtEnd = new Date(dt.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const loc = s.venue ? [s.venue.name, s.venue.city].filter(Boolean).join(', ') : ''
      cal.push(
        'BEGIN:VEVENT',
        `UID:${s.id || `showfinder-${i}`}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${s.artistName} at ${s.venue?.name || 'TBD'}`,
        loc ? `LOCATION:${loc}` : '',
        s.ticketUrl ? `URL:${s.ticketUrl}` : '',
        'END:VEVENT',
      )
    })
    cal.push('END:VCALENDAR')
    const blob = new Blob([cal.filter(Boolean).join('\r\n')], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'showfinder-shows.ics'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Calendar helpers
  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate()
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay()
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

  const showsByDate: Record<string, Show[]> = {}
  shows.forEach(s => {
    const d = s.eventDate.slice(0, 10) // YYYY-MM-DD
    if (!showsByDate[d]) showsByDate[d] = []
    showsByDate[d].push(s)
  })

  const daysInMonth = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfMonth(month, year)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ padding: '24px 20px 120px', maxWidth: 500, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text)' }}>Tracked</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {trackedArtists.length === 0 ? 'No artists yet' : `${trackedArtists.length} artist${trackedArtists.length !== 1 ? 's' : ''} · ${shows.length} show${shows.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setView(view === 'list' ? 'calendar' : 'list')} className="chip" style={{ fontSize: 11, padding: '5px 12px' }}>
            {view === 'list' ? '📅 Calendar' : '📋 List'}
          </button>
          {shows.length > 0 && (
            <button onClick={downloadCalendar} className="chip active" style={{ fontSize: 11, padding: '5px 12px' }}>
              ↓ .ics
            </button>
          )}
        </div>
      </div>

      {/* Tracked artists */}
      {trackedArtists.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="section-label">Following</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {trackedArtists.map(name => (
              <span key={name} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: '#eab30812', border: '1px solid #eab30830', color: '#eab308',
                fontSize: 11, fontWeight: 600,
              }}>
                {name}
                <button
                  onClick={() => toggleTrackedArtist(name)}
                  style={{ background: 'none', border: 'none', color: '#eab308', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
                >×</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 12 }}>Loading shows…</div>
      )}

      {/* Empty state */}
      {!loading && trackedArtists.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>No tracked artists</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280, margin: '0 auto' }}>
            Go to Artists → click the star on an artist to follow them. Their upcoming shows will show up here.
          </p>
        </div>
      )}

      {/* List view */}
      {!loading && view === 'list' && shows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shows.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()).map((show, i) => {
            const d = new Date(show.eventDate)
            const dayStr = d.toLocaleDateString('en-US', { weekday: 'short' })
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            const isPast = d < new Date()
            return (
              <div key={show.id || i} style={{
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                opacity: isPast ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                  <div style={{ minWidth: 44, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>{dayStr}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>{d.getDate()}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{show.artistName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {show.venue?.name || 'TBD'}{show.venue?.city ? ` — ${show.venue.city}` : ''}
                    </div>
                    {show.publicOnsaleAt && (
                      <div style={{ fontSize: 10, color: '#eab308', fontWeight: 600 }}>
                        Onsale {new Date(show.publicOnsaleAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                    {show.priceRange?.min != null && show.priceRange.min > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>from ${show.priceRange.min}</div>
                    )}
                  </div>
                  {show.ticketUrl && (
                    <a
                      href={show.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: 11, fontWeight: 700, color: 'var(--bg)',
                        background: 'var(--shows-primary)', borderRadius: 'var(--r-sm)',
                        padding: '6px 10px', textDecoration: 'none', whiteSpace: 'nowrap',
                      }}
                    >Tickets →</a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Calendar view */}
      {!loading && view === 'calendar' && (
        <div className="panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button
              onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
            >←</button>
            <div style={{ fontWeight: 800, fontFamily: 'Syne, sans-serif', fontSize: 16, color: 'var(--text)' }}>
              {MONTHS[month]} {year}
            </div>
            <button
              onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}
            >→</button>
          </div>
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayShows = showsByDate[dateStr] || []
              const isToday = dateStr === today
              return (
                <div key={day} style={{
                  padding: '4px 2px',
                  borderRadius: 'var(--r-sm)',
                  background: dayShows.length > 0 ? '#eab30810' : isToday ? 'var(--surface-2)' : 'transparent',
                  border: isToday ? '1px solid var(--accent)' : dayShows.length > 0 ? '1px solid #eab30830' : '1px solid transparent',
                  minHeight: 36,
                  textAlign: 'center',
                  cursor: dayShows.length > 0 ? 'pointer' : 'default',
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : dayShows.length > 0 ? 600 : 400,
                    color: dayShows.length > 0 ? '#eab308' : isToday ? 'var(--accent)' : 'var(--text-dim)',
                  }}>{day}</div>
                  {dayShows.length > 0 && (
                    <div style={{ fontSize: 8, color: '#eab308', fontWeight: 700, lineHeight: 1 }}>
                      {dayShows.length > 2 ? `${dayShows.length}★` : dayShows.map(s => s.artistName.slice(0, 3)).join(' ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar legend */}
      {!loading && view === 'calendar' && shows.length > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 'var(--r-md)', background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 6 }}>This month</div>
          {shows
            .filter(s => {
              const d = new Date(s.eventDate)
              return d.getMonth() === month && d.getFullYear() === year
            })
            .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())
            .map((s, i) => {
              const d = new Date(s.eventDate)
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ fontWeight: 600 }}>{s.artistName}</span>
                  <span style={{ color: 'var(--text-dim)' }}>{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              )
            })}
          {shows.filter(s => {
            const d = new Date(s.eventDate)
            return d.getMonth() === month && d.getFullYear() === year
          }).length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>No shows this month</div>
          )}
        </div>
      )}
    </div>
  )
}
