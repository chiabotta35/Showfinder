'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useSettings } from './SettingsContext'
import SettingsPanel from './SettingsPanel'

const NAV = [
  { id: 'dashboard', href: '/dashboard', label: 'Home', icon: 'home', color: 'var(--home-primary)' },
  { id: 'artists', href: '/artists', label: 'Artists', icon: 'music', color: 'var(--artists-primary)' },
  { id: 'shows', href: '/shows', label: 'Shows', icon: 'ticket', color: 'var(--shows-primary)', dynamic: true },
  { id: 'tracked', href: '/tracked', label: 'Tracked', icon: 'star', color: '#eab308' },
  { id: 'discover', href: '/discover', label: 'Discover', icon: 'compass', color: 'var(--discover-primary)' },
  { id: 'account', href: '/account', label: 'Account', icon: 'user', color: 'var(--account-primary)' },
]

function NavIcon({ name, color, active }: { name: string; color: string; active: boolean }) {
  const stroke = active ? color : 'currentColor'
  const fill = active ? color : 'none'
  const sw = active ? 2 : 1.6
  switch (name) {
    case 'home':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>
    case 'music':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    case 'ticket':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 5v2M13 17v2M13 11v2"/></svg>
    case 'star':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    case 'compass':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m16 8-3 6-6 3 3-6z"/></svg>
    case 'user':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
    default: return null
  }
}

export default function NavDock() {
  const pathname = usePathname()
  const { settings } = useSettings()
  const [showsUrl, setShowsUrl] = useState('/shows')
  const [showSettings, setShowSettings] = useState(false)
  useEffect(() => { const s = localStorage.getItem('lastShowsUrl'); if (s) setShowsUrl(s) }, [])

  // Filter and order nav items based on settings
  const visibleNav = settings.navdockOrder
    .filter(id => settings.navdockTabs.includes(id))
    .map(id => NAV.find(n => n.id === id))
    .filter(Boolean) as typeof NAV

  return (
    <>
      <nav
        style={{
          position: 'fixed',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          borderRadius: 'var(--r-xl)',
          padding: '6px 8px',
          display: 'flex',
          gap: 2,
          zIndex: 1000,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px var(--border)',
          width: 'calc(100% - 24px)',
          maxWidth: 440,
          justifyContent: 'space-around',
          background: 'var(--surface-1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {visibleNav.map(item => {
          const href = item.dynamic ? showsUrl : item.href
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <a
              key={item.id}
              href={href}
              aria-label={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '7px 8px 5px',
                borderRadius: 'var(--r-md)',
                textDecoration: 'none',
                color: active ? item.color : 'var(--text-muted)',
                background: active ? `color-mix(in srgb, ${item.color} 12%, transparent)` : 'transparent',
                transition: 'all 0.2s var(--ease-out)',
                flex: 1,
                minWidth: 0,
                position: 'relative',
              }}
            >
              <NavIcon name={item.icon} color={item.color} active={active} />
              <span style={{
                fontFamily: 'Outfit, sans-serif',
                fontSize: 9,
                fontWeight: active ? 700 : 500,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
              }}>{item.label}</span>
              {active && (
                <span style={{
                  position: 'absolute',
                  top: -1,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 16,
                  height: 2,
                  borderRadius: 1,
                  background: item.color,
                }} />
              )}
            </a>
          )
        })}
        {/* Settings gear */}
        <button
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '7px 8px 5px',
            borderRadius: 'var(--r-md)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            transition: 'all 0.2s var(--ease-out)',
            flex: 1,
            minWidth: 0,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          <span style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: 0.3,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}>Settings</span>
        </button>
      </nav>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </>
  )
}
