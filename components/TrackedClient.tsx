'use client'
import { useState } from 'react'
import { useSettings, type TrackedShow } from '@/components/SettingsContext'
import NavDock from './NavDock'

const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const moNm = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function fmtDay(d: string) { return new Date(d).getDate() }
function fmtMon(d: string) { return MON[new Date(d).getMonth()] }
function fmtTime(d: string) {
  const dt = new Date(d); let h = dt.getHours(); const m = dt.getMinutes()
  const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ap}`
}

export default function TrackedClient() {
  const { settings, toggleTrackedEvent } = useSettings()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [cursor, setCursor] = useState(() => new Date())

  const tracked = settings.trackedEvents
  const items = [...tracked].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const future = items.filter(e => new Date(e.date) >= new Date(new Date().toDateString()))

  const exportIcs = () => {
    let ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ShowFinder//EN\n'
    items.forEach(s => {
      const dt = new Date(s.date)
      const z = (n: number) => String(n).padStart(2, '0')
      const stamp = `${dt.getFullYear()}${z(dt.getMonth() + 1)}${z(dt.getDate())}T${z(dt.getHours())}${z(dt.getMinutes())}00`
      ics += `BEGIN:VEVENT\nSUMMARY:${s.artistName} @ ${s.venueName || 'TBD'}\nLOCATION:${s.venueCity || ''}\nDTSTART:${stamp}\nEND:VEVENT\n`
    })
    ics += 'END:VCALENDAR'
    const blob = new Blob([ics], { type: 'text/calendar' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'showfinder.ics'; a.click()
  }

  const y = cursor.getFullYear(), m = cursor.getMonth()
  const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate()
  const byDay: Record<number, TrackedShow[]> = {}
  items.forEach(s => { const d = new Date(s.date); if (d.getFullYear() === y && d.getMonth() === m) (byDay[d.getDate()] = byDay[d.getDate()] || []).push(s) })
  const cells: (number | null)[] = []
  for (let i = 0; i < first; i++) cells.push(null)
  for (let d = 1; d <= days; d++) cells.push(d)
  const today = new Date()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 100, position: 'relative' }}>
      <div className="page">
        <header className="page-head">
          <h1 className="page-title">Tracked</h1>
          <span className="count-pill" style={{ color: 'var(--sec-tracked)', borderColor: 'var(--sec-tracked)55' }}>{items.length}</span>
        </header>

        <div className="tracked-toolbar">
          <div className="seg" style={{ flex: 1 }}>
            {(['list', 'calendar'] as const).map(v => (
              <button key={v} className={`seg-btn ${view === v ? 'on' : ''}`} onClick={() => setView(v)}
                style={view === v ? { color: 'var(--accent-ink)', background: 'var(--accent)' } : {}}>
                {v === 'list' ? 'List' : 'Calendar'}
              </button>
            ))}
          </div>
          <button className="ics-btn" onClick={exportIcs} disabled={!items.length}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2ZM4 9h16M9 3v3M15 3v3" /></svg>
            Export .ics
          </button>
        </div>

        {items.length === 0 && (
          <div className="empty">
            <div className="empty-ico"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--sec-tracked)" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg></div>
            <div className="empty-title">No tracked shows yet</div>
            <div className="empty-sub">Tap the star on any show to track it here.</div>
          </div>
        )}

        {view === 'list' && items.length > 0 && (
          <div className="tracked-list">
            {items.map(s => (
              <div className="tracked-row" key={s.id}>
                <div className="tr-date">
                  <span className="trd-mon">{fmtMon(s.date)}</span>
                  <span className="trd-day">{fmtDay(s.date)}</span>
                </div>
                <div className="tr-info">
                  <b>{s.artistName}</b>
                  <span>{s.venueName || 'TBD'} &middot; {fmtTime(s.date)}</span>
                </div>
                <div className="tr-actions">
                  {s.ticketUrl && <a href={s.ticketUrl} target="_blank" rel="noopener noreferrer" className="tix-btn sm">Tickets<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" /></svg></a>}
                  <button className="star-btn on" onClick={() => toggleTrackedEvent(s)} title="Unstar">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--sec-tracked)" stroke="var(--sec-tracked)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'calendar' && (
          <div className="calendar">
            <div className="cal-head">
              <button className="icon-btn" onClick={() => setCursor(new Date(y, m - 1, 1))}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg></button>
              <span className="cal-title">{moNm[m]} {y}</span>
              <button className="icon-btn" onClick={() => setCursor(new Date(y, m + 1, 1))}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg></button>
            </div>
            <div className="cal-grid cal-dow">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
            <div className="cal-grid">
              {cells.map((d, i) => {
                const has = d && byDay[d]
                const isToday = d && today.getFullYear() === y && today.getMonth() === m && today.getDate() === d
                return (
                  <div key={i} className={`cal-cell ${d ? '' : ' empty'} ${isToday ? ' today' : ''}`}>
                    {d && <span className="cc-num">{d}</span>}
                    {has && <span className="cc-dots">{byDay[d]!.slice(0, 3).map((_, j) => <i key={j} style={{ background: 'var(--sec-tracked)' }} />)}</span>}
                  </div>
                )
              })}
            </div>
            <div className="cal-upcoming">
              {items.filter(s => { const d = new Date(s.date); return d.getFullYear() === y && d.getMonth() === m }).map(s => (
                <div className="cal-up-row" key={s.id}>
                  <span className="cur-day" style={{ color: 'var(--sec-tracked)' }}>{fmtDay(s.date)}</span>
                  <div><b>{s.artistName}</b><span>{s.venueName || 'TBD'}</span></div>
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
