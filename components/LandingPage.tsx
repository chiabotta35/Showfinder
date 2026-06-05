'use client'
import { useState, useEffect, useRef } from 'react'

export default function LandingPage() {
  const [lfConnecting, setLfConnecting] = useState(false)
  const [error, setError] = useState('')
  const popupRef = useRef<Window | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (e.data === 'lastfm_auth_success') {
        clearInterval(pollRef.current!)
        popupRef.current?.close()
        // Session is set server-side — just navigate
        window.location.href = '/dashboard'
      }
      if (e.data === 'lastfm_auth_failed') {
        clearInterval(pollRef.current!)
        popupRef.current?.close()
        setLfConnecting(false)
        setError('Last.fm connection failed. Make sure your LASTFM_API_KEY is set in .env.local.')
      }
    }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [])

  function loginWithLastfm() {
    setLfConnecting(true); setError('')
    const w = 500, h = 640
    const popup = window.open(
      '/api/auth/lastfm?popup=1', 'lastfm_auth',
      `width=${w},height=${h},left=${window.screenX + (window.outerWidth - w) / 2},top=${window.screenY + (window.outerHeight - h) / 2},toolbar=no,menubar=no`
    )
    popupRef.current = popup
    pollRef.current = setInterval(() => {
      if (popup?.closed) {
        clearInterval(pollRef.current!)
        // Check if auth completed even if message was missed
        fetch('/api/auth/session').then(r => r.json()).then(d => {
          if (d.lastfmConnected || d.userId) {
            window.location.href = '/dashboard'
          } else {
            setLfConnecting(false)
          }
        })
      }
    }, 500)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)', backgroundSize: '60px 60px', opacity: 0.4, pointerEvents: 'none' }} />
      {/* Accent glow */}
      <div style={{ position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '500px', background: 'radial-gradient(ellipse, rgba(200,255,87,0.07) 0%, transparent 65%)', pointerEvents: 'none' }} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '17px', color: 'var(--text)', letterSpacing: '-0.3px' }}>SHOWFINDER</span>
        <a href="/login" style={{ fontSize: '13px', color: 'var(--text-muted)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '8px', padding: '6px 14px', fontFamily: 'Outfit', transition: 'color 0.15s, border-color 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)' }}
        >Sign in</a>
      </nav>

      {/* Hero */}
      <main style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 65px)', padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '11px', letterSpacing: '4px', color: 'var(--accent)', marginBottom: '24px', textTransform: 'uppercase' }}>Concert Discovery</p>

        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 'clamp(44px, 9vw, 86px)', lineHeight: 0.93, letterSpacing: '-3px', color: 'var(--text)', marginBottom: '24px', maxWidth: '860px' }}>
          Shows from the<br /><span style={{ color: 'var(--accent)' }}>artists you actually</span><br />listen to
        </h1>

        <p style={{ fontSize: '17px', color: 'var(--text-muted)', fontFamily: 'Outfit', lineHeight: 1.6, maxWidth: '460px', marginBottom: '44px', fontWeight: 300 }}>
          Connect Last.fm and ShowFinder ranks upcoming concerts by your real play counts — not curated picks or algorithms.
        </p>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '10px', padding: '10px 18px', marginBottom: '20px', fontSize: '13px', color: '#ff8080', fontFamily: 'Outfit', maxWidth: '380px' }}>
            {error}
          </div>
        )}

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '340px' }}>
          {/* Last.fm login — primary */}
          <button
            onClick={loginWithLastfm}
            disabled={lfConnecting}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px 28px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '12px', fontFamily: 'Syne', fontWeight: 700, fontSize: '15px', cursor: lfConnecting ? 'not-allowed' : 'pointer', opacity: lfConnecting ? 0.7 : 1, transition: 'opacity 0.2s' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.02 0C5.38 0 0 5.38 0 12s5.38 12 12 12 12-5.38 12-12S18.64 0 12.02 0zm5.58 14.71c-.22.53-.67.88-1.22.88-.32 0-.62-.08-.9-.24l-2.36-1.4-.67 3.54c-.1.52-.53.88-1.05.88-.52 0-.96-.36-1.05-.88l-.94-4.94-1.55.94c-.28.16-.58.24-.9.24-.55 0-1-.35-1.22-.88l-1.4-3.4c-.12-.29-.14-.6-.06-.9.08-.3.26-.56.52-.72.26-.16.56-.2.85-.12l3.77 1.24.28-1.48c.1-.52.53-.88 1.05-.88s.96.36 1.05.88l.42 2.2 2.42 1.44c.26.16.44.42.52.72.08.3.06.61-.06.9l-.52 1.22z"/></svg>
            {lfConnecting ? 'Opening Last.fm…' : 'Sign in with Last.fm'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'Outfit' }}>OR</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Email signup */}
          <a href="/signup" style={{ display: 'block', textAlign: 'center', padding: '14px 28px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '12px', fontFamily: 'Outfit', fontWeight: 500, fontSize: '14px', textDecoration: 'none', transition: 'border-color 0.15s, color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >Create account with email</a>

          <p style={{ fontSize: '12px', color: 'var(--text-dim)', fontFamily: 'Outfit', marginTop: '4px' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--text-muted)', textDecoration: 'underline' }}>Sign in</a>
          </p>
        </div>

        {/* Feature pills */}
        <div style={{ marginTop: '64px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: 'Ranked by play counts', icon: '♪' },
            { label: 'Ticketmaster + Bandsintown', icon: '🎟' },
            { label: '29 touring hubs', icon: '📍' },
            { label: 'iCal export', icon: '📅' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '100px', padding: '6px 14px' }}>
              <span style={{ fontSize: '12px' }}>{f.icon}</span>
              <span style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-muted)' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
