'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/artists', label: 'Artists', icon: 'music' },
  { href: '/shows', label: 'Shows', icon: 'ticket', dynamic: true },
  { href: '/discover', label: 'Discover', icon: 'compass' },
  { href: '/account', label: 'Account', icon: 'user' },
]

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? '#000' : 'currentColor'
  const sw = 1.8
  switch (name) {
    case 'home':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z"/></svg>
    case 'music':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    case 'ticket':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M13 5v2M13 17v2M13 11v2"/></svg>
    case 'compass':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m16 8-3 6-6 3 3-6z"/></svg>
    case 'user':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
    default: return null
  }
}

export default function NavDock() {
  const pathname = usePathname()
  const [showsUrl, setShowsUrl] = useState('/artists')
  useEffect(() => { const s = localStorage.getItem('lastShowsUrl'); if (s) setShowsUrl(s) }, [])

  return (
    <nav
      className="glass"
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        borderRadius: 'var(--r-xl)',
        padding: '6px',
        display: 'flex',
        gap: 2,
        zIndex: 1000,
        boxShadow: 'var(--shadow-lg)',
        width: 'calc(100% - 32px)',
        maxWidth: 420,
        justifyContent: 'space-around',
      }}
    >
      {NAV.map(item => {
        const href = item.dynamic ? showsUrl : item.href
        const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        return (
          <a
            key={item.href}
            href={href}
            aria-label={item.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '8px 10px',
              borderRadius: 'var(--r-md)',
              textDecoration: 'none',
              color: active ? '#000' : 'var(--text-muted)',
              background: active ? 'var(--accent)' : 'transparent',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              flex: 1,
              minWidth: 0,
            }}
          >
            <NavIcon name={item.icon} active={active} />
            <span style={{
              fontFamily: 'Outfit, sans-serif',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
