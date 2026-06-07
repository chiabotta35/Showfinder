'use client'
import { useState } from 'react'
import { useSettings, type TrackedShow } from '@/components/SettingsContext'

export default function TrackedClient() {
  const { settings, toggleTrackedEvent } = useSettings()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [year, setYear] = useState(() => new Date().getFullYear())

  const tracked = settings.trackedEvents
  const sorted = [...tracked].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const future = sorted.filter(e => new Date(e.date) >= new Date(new Date().toDateString()))

  const downloadCalendar = () => {
    const cal = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ShowFinder//Tracked//EN', 'X-WR-CALNAME:ShowFinder Shows']
    future.forEach((s, i) => {
      const dt = new Date(s.date)
      const dtStart = dt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const dtEnd = new Date(dt.getTime() + 3 * 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      const loc = [s.venueName, s.venueCity].filter(Boolean).join(', ')
      cal.push(
        'BEGIN:VEVENT',
        `UID:${s.id || `showfinder-${i}`}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        `SUMMARY:${s.artistName} at ${s.venueName || 'TBD'}`,
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

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const getDaysInMonth = (m: number, y: number) => new Date(y, m + 1, 0).getDate()
  const getFirstDayOfMonth = (m: number, y: number) => new Date(y, m, 1).getDay()

  const showsByDate: Record<string, TrackedShow[]> = {}
  future.forEach(s => {
    const d = s.date.slice(0, 10)
    if (!showsByDate[d]) showsByDate[d] = []
    showsByDate[d].push(s)
  })

  const daysInMonth = getDaysInMonth(month, year)
  const firstDay = getFirstDayOfMonth(month, year)
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div style={{ padding: '24px 20px 120px', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text)' }}>Tracked</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {tracked.length === 0 ? 'No shows starred' : `${tracked.length} starred · ${future.length} upcoming`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setView(view === 'list' ? 'calendar' : 'list')} className="chip" style={{ fontSize: 11, padding: '5px 12px' }}>
            {view === 'list' ? 'Calendar' : 'List'}
          </button>
          {future.length > 0 && (
            <button onClick={downloadCalendar} className="chip active" style={{ fontSize: 11, padding: '5px 12px' }}>
              .ics
            </button>
          )}
        </div>
      </div>

      {tracked.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>&#9733;</div>
          <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>No starred shows</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280, margin: '0 auto' }}>
            Go to Shows and tap the star on any show to track it here.
          </p>
        </div>
      )}

      {view === 'list' && sorted.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((show) => {
            const d = new Date(show.date)
            const isPast = d < new Date()
            return (
              <div key={show.id} style={{
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--surface-1)', border: '1px solid var(--border)',
                opacity: isPast ? 0.5 : 1,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                  <div style={{ minWidth: 44, textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>{d.getDate()}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>{d.toLocaleDateString('en-US', { month: 'short' })}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{show.artistName}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {show.venueName || 'TBD'}{show.venueCity ? ` — ${show.venueCity}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'start' }}>
                    {show.ticketUrl && (
                      <a
                        href={show.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: 11, fontWeight: 700, color: 'var(--bg)',
                          background: 'var(--accent)', borderRadius: 'var(--r-sm)',
                          padding: '6px 10px', textDecoration: 'none', whiteSpace: 'nowrap',
                        }}
                      >Tickets</a>
                    )}
                    <button
                      onClick={() => toggleTrackedEvent(show)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: '#eab308', padding: '6px 4px',
                      }}
                      title="Unstar"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#eab308" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {view === 'calendar' && (
        <div className="panel" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <button onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>&#8592;</button>
            <div style={{ fontWeight: 800, fontFamily: 'Syne, sans-serif', fontSize: 16, color: 'var(--text)' }}>{MONTHS[month]} {year}</div>
            <button onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>&#8594;</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600, color: 'var(--text-dim)', padding: '4px 0' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const dayShows = showsByDate[dateStr] || []
              const isToday = dateStr === today
              return (
                <div key={day} style={{
                  padding: '4px 2px', borderRadius: 'var(--r-sm)', minHeight: 36, textAlign: 'center',
                  background: dayShows.length > 0 ? '#eab30810' : isToday ? 'var(--surface-2)' : 'transparent',
                  border: isToday ? '1px solid var(--accent)' : dayShows.length > 0 ? '1px solid #eab30830' : '1px solid transparent',
                }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: isToday ? 700 : dayShows.length > 0 ? 600 : 400,
                    color: dayShows.length > 0 ? '#eab308' : isToday ? 'var(--accent)' : 'var(--text-dim)',
                  }}>{day}</div>
                  {dayShows.length > 0 && (
                    <div style={{ fontSize: 8, color: '#eab308', fontWeight: 700, lineHeight: 1 }}>
                      {dayShows.length > 2 ? `${dayShows.length}*` : dayShows.map(s => s.artistName.slice(0, 3)).join(' ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
