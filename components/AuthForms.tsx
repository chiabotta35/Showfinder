'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AuthForms() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastfmConnecting, setLastfmConnecting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const url = mode === 'login' ? '/api/auth/login' : '/api/auth/signup'
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Authentication failed')
      router.push('/artists')
    } catch (err: any) {
      setError(err.message)
    } finally { setLoading(false) }
  }

  function connectLastfm() {
    setLastfmConnecting(true)
    const w = window.open('/api/auth/lastfm?popup=1', 'lastfm', 'width=600,height=700')
    const tick = setInterval(() => {
      if (w?.closed) {
        clearInterval(tick)
        setLastfmConnecting(false)
        setTimeout(() => { try { router.push('/artists') } catch {} }, 500)
      }
    }, 500)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        maxWidth: 400,
        width: '100%',
      }}>

        {/* Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: 24,
          animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <p style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 700,
            fontSize: 11,
            color: 'var(--accent)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 12,
          }}>ShowFinder</p>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 24,
            color: 'var(--text)',
            marginBottom: 6,
          }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: 13,
            color: 'var(--text-secondary)',
          }}>
            {mode === 'login' ? 'Sign in to continue' : 'Sign up to get started'}
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{
          padding: 32,
          animation: 'fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both',
        }}>

          {/* Error display */}
          {error && (
            <div style={{
              background: 'rgba(220, 38, 38, 0.08)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
              marginBottom: 20,
            }}>
              <p style={{
                fontSize: 13,
                color: 'var(--red)',
                fontFamily: 'Outfit, sans-serif',
                margin: 0,
              }}>{error}</p>
            </div>
          )}

          {/* Last.fm button */}
          <button
            onClick={connectLastfm}
            disabled={lastfmConnecting}
            className="btn-ghost"
            style={{
              width: '100%',
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 600,
              marginBottom: 20,
              border: '1px solid color-mix(in srgb, var(--artists-primary) 30%, var(--border))',
              borderRadius: 'var(--r-md)',
              cursor: lastfmConnecting ? 'wait' : 'pointer',
            }}
          >
            <span style={{ fontSize: 16 }}>♫</span>
            {lastfmConnecting ? 'Opening Last.fm…' : 'Connect with Last.fm'}
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 10, color: 'var(--text-faint)', letterSpacing: 1.5 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={submit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{
                display: 'block',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 600,
                fontSize: 11,
                color: 'var(--text-secondary)',
                letterSpacing: 0.5,
                marginBottom: 6,
              }}>USERNAME</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{
                  width: '100%',
                  height: 44,
                  boxSizing: 'border-box',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '0 14px',
                  color: 'var(--text)',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontFamily: 'Syne, sans-serif',
                fontWeight: 600,
                fontSize: 11,
                color: 'var(--text-secondary)',
                letterSpacing: 0.5,
                marginBottom: 6,
              }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{
                  width: '100%',
                  height: 44,
                  boxSizing: 'border-box',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: '0 14px',
                  color: 'var(--text)',
                  fontFamily: 'Outfit, sans-serif',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.15s ease',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                height: 44,
                fontSize: 14,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                opacity: loading ? 0.6 : 1,
                cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          </form>
        </div>

        {/* Toggle */}
        <p style={{
          textAlign: 'center',
          fontFamily: 'Outfit, sans-serif',
          fontSize: 13,
          color: 'var(--text-secondary)',
          marginTop: 20,
        }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
