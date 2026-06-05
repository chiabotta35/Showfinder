'use client'
import { useState, useEffect, useRef } from 'react'
import NavDock from './NavDock'

interface Props {
  lastfmUser: { username: string; displayName: string; scrobbleCount?: number } | null
}

const FEATURES = [
  {
    id: 'shows', icon: '🎟', title: 'Find Shows', active: true, href: '/artists', accent: '#c8ff57',
    desc: 'Search upcoming concerts from your artists near you and in cities worth the drive.',
  },
  {
    id: 'discover', icon: '🔭', title: 'Discover', active: true, href: '/discover', accent: '#42a5f5', badge: 'NEW',
    desc: "Artists you've drifted from and new recommendations based on your listening history.",
  },
  {
    id: 'alerts', icon: '🔔', title: 'Show Alerts', active: false, href: '#', accent: '#ffa726',
    desc: 'Get notified when an artist you follow announces a show near you.',
  },
  {
    id: 'stats', icon: '📊', title: 'Listening Stats', active: false, href: '#', accent: '#ab47bc',
    desc: 'Your top artists, genres, and listening trends over time.',
  },
  {
    id: 'friends', icon: '👥', title: 'Friends', active: false, href: '#', accent: '#26a69a',
    desc: "See what your Last.fm friends are listening to and what shows they're attending.",
  },
  {
    id: 'setlists', icon: '📋', title: 'Setlists', active: false, href: '#', accent: '#ef5350',
    desc: 'Preview recent setlists before buying tickets so you know what to expect.',
  },
]

function getGreeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Late night'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function HubDashboard({ lastfmUser }: Props) {
  const [greeting, setGreeting] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setGreeting(getGreeting()) }, [])

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data === 'lastfm_auth_success') {
        clearInterval(pollRef.current!); popupRef.current?.close()
        window.location.reload()
      }
      if (e.data === 'lastfm_auth_failed') {
        clearInterval(pollRef.current!); popupRef.current?.close()
        setConnecting(false); setError('Last.fm connection failed. Check your API keys in .env.local.')
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function openPopup() {
    setConnecting(true); setError('')
    const w = 500, h = 640
    const popup = window.open(
      '/api/auth/lastfm?popup=1', 'lastfm_auth',
      `width=${w},height=${h},left=${window.screenX + (window.outerWidth - w) / 2},top=${window.screenY + (window.outerHeight - h) / 2},toolbar=no,menubar=no,scrollbars=yes`
    )
    popupRef.current = popup
    pollRef.current = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollRef.current!)
        setConnecting(false)
        // Check if auth succeeded by hitting session endpoint
        fetch('/api/auth/session').then(r => r.json()).then(d => {
          if (d.lastfmConnected) window.location.reload()
        })
      }
    }, 500)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)', padding: '0 28px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '16px', color: 'var(--text)', letterSpacing: '-0.3px' }}>SHOWFINDER</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {lastfmUser ? (
            <>
              <a href="/account" style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Outfit', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 12px', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                {lastfmUser.displayName}
              </a>
              <form action="/api/auth/logout" method="POST">
                <button style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Outfit', transition: 'color 0.15s, border-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ff4d4d'; e.currentTarget.style.borderColor = '#ff4d4d' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                >Sign out</button>
              </form>
            </>
          ) : (
            <button onClick={openPopup} disabled={connecting} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontFamily: 'Syne', fontWeight: 700, cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.7 : 1, transition: 'opacity 0.2s' }}>
              {connecting ? 'Connecting…' : 'Connect Last.fm'}
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px 120px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontFamily: 'Outfit', fontSize: '14px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 300 }}>
            {greeting || 'Welcome'}
          </p>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(30px, 5vw, 46px)', color: 'var(--text)', lineHeight: 1.05, letterSpacing: '-1.5px', marginBottom: '8px' }}>
            {lastfmUser ? `${lastfmUser.displayName.split(' ')[0]}.` : 'there.'}
          </h1>
          {lastfmUser?.scrobbleCount ? (
            <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'Outfit', fontWeight: 300 }}>
              {lastfmUser.scrobbleCount.toLocaleString()} scrobbles tracked on Last.fm
            </p>
          ) : !lastfmUser && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'Outfit', fontWeight: 300 }}>
              Connect Last.fm to rank shows by your actual listening history.
            </p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#ff8080', fontFamily: 'Outfit' }}>
            {error}
          </div>
        )}

        {/* Last.fm CTA if not connected */}
        {!lastfmUser && (
          <div style={{ background: 'var(--surface)', border: '1px solid #c8ff5722', borderRadius: '16px', padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '100%', background: 'radial-gradient(ellipse at right, rgba(200,255,87,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div>
              <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '4px' }}>Connect Last.fm</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Outfit', lineHeight: 1.5 }}>Shows ranked by how much you actually listen to each artist — not arbitrary sorting.</p>
            </div>
            <button onClick={openPopup} disabled={connecting} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '10px', padding: '11px 20px', fontFamily: 'Syne', fontWeight: 700, fontSize: '13px', cursor: connecting ? 'not-allowed' : 'pointer', opacity: connecting ? 0.7 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {connecting ? '...' : 'Connect →'}
            </button>
          </div>
        )}

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {FEATURES.map(f => (
            <a
              key={f.id}
              href={f.active ? f.href : undefined as any}
              style={{ textDecoration: 'none', display: 'block', cursor: f.active ? 'pointer' : 'default' }}
            >
              <div
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '22px', opacity: f.active ? 1 : 0.4, transition: 'border-color 0.2s, transform 0.15s', position: 'relative', overflow: 'hidden', height: '100%' }}
                onMouseEnter={e => {
                  if (!f.active) return
                  e.currentTarget.style.borderColor = f.accent + '55'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Accent glow */}
                {f.active && (
                  <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: `radial-gradient(circle at top right, ${f.accent}12 0%, transparent 70%)`, pointerEvents: 'none' }} />
                )}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '26px', lineHeight: 1 }}>{f.icon}</span>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    {f.badge && (
                      <span style={{ fontSize: '9px', fontFamily: 'Syne', fontWeight: 700, letterSpacing: '0.08em', color: f.accent, border: `1px solid ${f.accent}55`, borderRadius: '4px', padding: '2px 6px' }}>{f.badge}</span>
                    )}
                    {!f.active && (
                      <span style={{ fontSize: '9px', fontFamily: 'Syne', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px' }}>SOON</span>
                    )}
                    {f.active && (
                      <span style={{ fontSize: '14px', color: 'var(--text-dim)' }}>→</span>
                    )}
                  </div>
                </div>
                <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '15px', color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.2px' }}>{f.title}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Outfit', lineHeight: 1.55 }}>{f.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </main>

      <NavDock />
    </div>
  )
}
