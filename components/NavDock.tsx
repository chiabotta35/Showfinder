'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSettings } from './SettingsContext'
import SettingsPanel from './SettingsPanel'

const NAV = [
  { id: 'home', href: '/dashboard', label: 'Home', color: 'var(--sec-home)' },
  { id: 'artists', href: '/artists', label: 'Artists', color: 'var(--sec-artists)' },
  { id: 'shows', href: '/shows', label: 'Shows', color: 'var(--sec-shows)', dynamic: true },
  { id: 'tracked', href: '/tracked', label: 'Tracked', color: 'var(--sec-tracked)' },
  { id: 'discover', href: '/discover', label: 'Discover', color: 'var(--sec-discover)' },
  { id: 'account', href: '/account', label: 'Account', color: 'var(--sec-account)' },
]

const ICONS: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9',
  artists: 'M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM3 20a5 5 0 0 1 10 0M16 14a5 5 0 0 1 5 5',
  shows: 'M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z M14 6v12',
  tracked: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.5 9.7l5.9-.9Z',
  discover: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM15.5 8.5l-2 5-5 2 2-5Z',
  account: 'M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4ZM5 20a7 7 0 0 1 14 0',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4 12l-1.2-.7.9-2.2 1.4.2a6.8 6.8 0 0 1 1.1-1.1L6 6.8l2.2-.9L9 7.1a6.8 6.8 0 0 1 1.5 0l.8-1.2 2.2.9-.2 1.4a6.8 6.8 0 0 1 1.1 1.1l1.4-.2.9 2.2L17 12l.7.7-.9 2.2-1.4-.2a6.8 6.8 0 0 1-1.1 1.1l.2 1.4-2.2.9-.7-1.2a6.8 6.8 0 0 1-1.5 0l-.8 1.2-2.2-.9.2-1.4a6.8 6.8 0 0 1-1.1-1.1l-1.4.2-.9-2.2Z',
}

function NavIcon({ name, color, active }: { name: string; color: string; active: boolean }) {
  const d = ICONS[name] || ''
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? color : 'var(--faint)'} strokeWidth={active ? 2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
      {active && name === 'tracked' && <path d={d} fill={color} />}
    </svg>
  )
}

export default function NavDock() {
  const pathname = usePathname()
  const { settings } = useSettings()
  const [showsUrl, setShowsUrl] = useState('/shows')
  const [showSettings, setShowSettings] = useState(false)
  useEffect(() => { const s = localStorage.getItem('lastShowsUrl'); if (s) setShowsUrl(s) }, [])

  const visibleNav = NAV.filter(n => settings.navdockTabs.includes(n.id))

  return (
    <>
      <nav className="navdock">
        {visibleNav.map(item => {
          const href = item.dynamic ? showsUrl : item.href
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <button key={item.id} className="nav-item" onClick={() => { window.location.href = href }}>
              {active && <span className="nav-accent" style={{ background: item.color }} />}
              <NavIcon name={item.id} color={item.color} active={active} />
              <span className="nav-label" style={{ color: active ? item.color : 'var(--faint)' }}>{item.label}</span>
            </button>
          )
        })}
        <button className="nav-item nav-gear" onClick={() => setShowSettings(true)} title="Settings">
          <NavIcon name="settings" color="var(--faint)" active={false} />
          <span className="nav-label" style={{ color: 'var(--faint)' }}>Settings</span>
        </button>
      </nav>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  )
}
