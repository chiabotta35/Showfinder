'use client'
import { useState, useEffect, useRef, createContext, useCallback } from 'react'
import { useSettings } from './SettingsContext'
import SettingsPanel from './SettingsPanel'
import LocationBar from './LocationBar'
import type { UserLocation, TouringHub } from '@/types'

interface ShellContextValue {
  location: UserLocation | null
  hubs: TouringHub[]
  setLocation: (loc: UserLocation, hubs: TouringHub[]) => void
  openSettings: () => void
  showFlash: (msg: string) => void
  flashMsg: string | null
  userName: string
}
export const ShellContext = createContext<ShellContextValue>({ location: null, hubs: [], setLocation: () => {}, openSettings: () => {}, showFlash: () => {}, flashMsg: null, userName: '' })

const NAV = [
  { id: 'home', href: '/dashboard', label: 'Home', color: '#2dd4bf' },
  { id: 'artists', href: '/artists', label: 'Artists', color: '#4aa8ff' },
  { id: 'shows', href: '/shows', label: 'Shows', color: '#ff9a3c' },
  { id: 'tracked', href: '/tracked', label: 'Tracked', color: '#facc15' },
  { id: 'discover', href: '/discover', label: 'Discover', color: '#a78bfa' },
  { id: 'account', href: '/account', label: 'Account', color: '#9aa6ab' },
]

const SECTION_COLORS: Record<string, string> = {
  home: '#2dd4bf', artists: '#4aa8ff', shows: '#ff9a3c',
  tracked: '#facc15', discover: '#a78bfa', account: '#9aa6ab',
}

const ICONS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9',
  artists: 'M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM3 20a5 5 0 0 1 10 0M16 14a5 5 0 0 1 5 5',
  shows: 'M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z M14 6v12',
  tracked: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z',
  discover: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5Z',
  account: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM5 20a7 7 0 0 1 14 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12l-1.2-.7.9-2.2 1.4.2a6.8 6.8 0 0 1 1.1-1.1L6 6.8l2.2-.9L9 7.1a6.8 6.8 0 0 1 1.5 0l.8-1.2 2.2.9-.2 1.4a6.8 6.8 0 0 1 1.1 1.1l1.4-.2.9 2.2L17 12l.7.7-.9 2.2-1.4-.2a6.8 6.8 0 0 1-1.1 1.1l.2 1.4-2.2.9-.7-1.2a6.8 6.8 0 0 1-1.5 0l-.8 1.2-2.2-.9.2-1.4a6.8 6.8 0 0 1-1.1-1.1l-1.4.2-.9-2.2Z',
  location: 'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  crosshair: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 3v3M12 18v3M3 12h3M18 12h3',
  chevDown: 'M6 9l6 6 6-6',
  close: 'M6 6l12 12M18 6 6 18',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z',
  plus: 'M12 5v14M5 12h14',
}

function NavIcon({ name, color, active }: { name: string; color: string; active: boolean }) {
  const d = ICONS[name] || ''
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'var(--faint)'} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {active && name === 'tracked' && <path d={d} fill={color} />}
    </svg>
  )
}

function Brand({ onNav }: { onNav: (href: string) => void }) {
  return (
    <button className="brand" onClick={() => onNav('/dashboard')}>
      <span className="brand-mark" style={{ background: 'var(--accent)' }}>
        <svg width="20" height="20" viewBox="0 0 20 20"><g fill="var(--accent-ink)">
          <rect x="3" y="8" width="3" height="9" rx="1.5" />
          <rect x="8.5" y="3" width="3" height="14" rx="1.5" />
          <rect x="14" y="6" width="3" height="11" rx="1.5" />
        </g></svg>
      </span>
      <span className="brand-name">ShowFinder</span>
    </button>
  )
}

function Sidebar({ route, onNav, tabs, onSettings }: { route: string; onNav: (href: string) => void; tabs: string[]; onSettings: () => void }) {
  const alwaysShow = ['tracked']
  const visible = NAV.filter(n => tabs.includes(n.id) || alwaysShow.includes(n.id))
  return (
    <nav className="sitenav">
      <Brand onNav={onNav} />
      <div className="nav-items">
        {visible.map(item => {
          const active = route === item.id
          return (
            <button key={item.id} className={`nav-item ${active ? 'on' : ''}`} onClick={() => onNav(item.href)}>
              <span className="nav-accent" style={{ background: SECTION_COLORS[item.id] }} />
              <NavIcon name={item.id} color={SECTION_COLORS[item.id]} active={active} />
              <span className="nav-label" style={{ color: active ? 'var(--text)' : 'var(--dim)' }}>{item.label}</span>
            </button>
          )
        })}
      </div>
      <button className="nav-item nav-gear" onClick={onSettings}>
        <span className="nav-accent" />
        <NavIcon name="settings" color="var(--faint)" active={false} />
        <span className="nav-label" style={{ color: 'var(--dim)' }}>Settings</span>
      </button>
    </nav>
  )
}

function TopBarSearch({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState('')
  const submit = () => { const n = v.trim(); if (!n) return; onAdd(n); setV('') }
  return (
    <div className="artist-search">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4" /></svg>
      <input value={v} onChange={e => setV(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Add an artist manually…" />
      <button className="add-btn" onClick={submit} disabled={!v.trim()} style={{ background: v.trim() ? 'var(--accent)' : 'var(--surface2)', color: v.trim() ? 'var(--accent-ink)' : 'var(--faint)' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
      </button>
    </div>
  )
}

function TopBarAvatar({ name, onClick }: { name: string; onClick: () => void }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
  let hash = 0
  for (const c of name) hash = ((hash * 31) + c.charCodeAt(0)) >>> 0
  const hue = hash % 360
  return (
    <button className="topbar-avatar" onClick={onClick} title="Account" style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, hsl(${hue}, 40%, 35%), hsl(${(hue + 40) % 360}, 35%, 28%))`, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 12, fontWeight: 700, border: 'none', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)' }}>
      {initials}
    </button>
  )
}

function TopBar({ location, onLocationChange, onAddArtist, onFindShows, onNav, userName }: {
  location: UserLocation | null; onLocationChange: (city: string) => void; onAddArtist: (name: string) => void; onFindShows: () => void; onNav: (href: string) => void; userName: string
}) {
  return (
    <header className="topbar">
      <div className="topbar-loc">
        <LocationBar savedLocation={location ? { city: location.city, region: location.region, lat: location.latitude, lng: location.longitude } : null} onLocationChange={(loc) => onLocationChange(loc.city)} compact />
      </div>
      <div className="topbar-search">
        <TopBarSearch onAdd={onAddArtist} />
      </div>
      <div className="topbar-actions">
        <button className="find-btn" onClick={onFindShows} style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 3v3M12 18v3M3 12h3M18 12h3" /></svg>
          <span>Find Shows</span>
        </button>
        <TopBarAvatar name={userName} onClick={() => onNav('/account')} />
      </div>
    </header>
  )
}

interface Props {
  route: string
  children: React.ReactNode
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
  userName?: string
  onAddArtist?: (name: string) => void
}

export default function Shell({ route, children, savedLocation, userName = 'User', onAddArtist }: Props) {
  const { settings } = useSettings()
  const [showSettings, setShowSettings] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (savedLocation && isFinite(savedLocation.lat) && isFinite(savedLocation.lng)) {
      setLocation({ city: savedLocation.city, region: savedLocation.region, country: 'US', latitude: savedLocation.lat, longitude: savedLocation.lng })
    }
  }, [savedLocation])

  const handleNav = useCallback((href: string) => { window.location.href = href }, [])

  const showFlash = useCallback((msg: string) => {
    setFlash(msg)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(f => f === msg ? null : f), 1800)
  }, [])

  const findShows = useCallback(() => {
    handleNav('/shows')
    showFlash('Searching near ' + (location?.city?.split(',')[0] || 'you') + '…')
  }, [handleNav, showFlash, location])

  const handleAddArtist = useCallback((name: string) => {
    if (onAddArtist) onAddArtist(name)
    showFlash('Added ' + name)
  }, [onAddArtist, showFlash])

  const ctx: ShellContextValue = { location, hubs, setLocation: (loc, h) => { setLocation(loc); setHubs(h) }, openSettings: () => setShowSettings(true), showFlash, flashMsg: flash, userName }

  return (
    <ShellContext.Provider value={ctx}>
      <div className="site">
        <aside className="sidebar">
          <Sidebar route={route} onNav={handleNav} tabs={settings.navdockTabs} onSettings={() => setShowSettings(true)} />
        </aside>
        <div className="main">
          <TopBar
            location={location}
            onLocationChange={(city) => {
              if (location) { setLocation({ ...location, city }); }
            }}
            onAddArtist={handleAddArtist}
            onFindShows={findShows}
            onNav={handleNav}
            userName={userName}
          />
          <div className="content">
            {children}
          </div>
        </div>
      </div>
      {flash && <div className="flash"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" /></svg>{flash}</div>}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </ShellContext.Provider>
  )
}
