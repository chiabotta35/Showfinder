'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
  { href: '/dashboard', label: 'Home', icon: '⌂' },
  { href: '/artists', label: 'Artists', icon: '♪' },
  { href: '/shows', label: 'Shows', icon: '◈', dynamic: true },
  { href: '/discover', label: 'Discover', icon: '✦' },
  { href: '/account', label: 'Account', icon: '◯' },
]

export default function NavDock() {
  const pathname = usePathname()
  const [showsUrl, setShowsUrl] = useState('/artists')
  useEffect(() => { const s = localStorage.getItem('lastShowsUrl'); if (s) setShowsUrl(s) }, [])
  return (
    <nav style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(17,17,17,0.95)', backdropFilter: 'blur(20px)', border: '1px solid var(--border)', borderRadius: '20px', padding: '6px 8px', display: 'flex', gap: '2px', zIndex: 1000, boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      {NAV.map(item => {
        const href = item.dynamic ? showsUrl : item.href
        const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
        return (
          <a key={item.href} href={href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 14px', borderRadius: '14px', textDecoration: 'none', background: active ? 'var(--accent)' : 'transparent', transition: 'all 0.2s', minWidth: '52px' }}>
            <span style={{ fontSize: '16px', lineHeight: 1, filter: active ? 'none' : 'grayscale(1) opacity(0.5)' }}>{item.icon}</span>
            <span style={{ fontFamily: 'Outfit', fontSize: '9px', fontWeight: 600, color: active ? '#000' : 'var(--text-dim)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
