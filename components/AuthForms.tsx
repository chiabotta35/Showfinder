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
    const w = window.open('/api/auth/lastfm', 'lastfm', 'width=600,height=700')
    const tick = setInterval(() => {
      if (w?.closed) { clearInterval(tick); setLastfmConnecting(false); router.push('/artists') }
    }, 500)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 12 }}>ShowFinder</p>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 6 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Sign in to continue' : 'Sign up to get started'}
          </p>
        </div>

        <div className="card" style={{ padding: 24, animation: 'fadeUp 0.5s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
          <button onClick={connectLastfm} disabled={lastfmConnecting} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14, marginBottom: 20 }}>
            {lastfmConnecting ? 'Opening Last.fm…' : 'Connect with Last.fm'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 10, color: 'var(--text-faint)', letterSpacing: 1.5 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 6 }}>USERNAME</label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px', color: 'var(--text)', fontFamily: 'Outfit, sans-serif', fontSize: 14, outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.5, marginBottom: 6 }}>PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px', color: 'var(--text)', fontFamily: 'Outfit, sans-serif', fontSize: 14, outline: 'none' }}
              />
            </div>
            {error && <p style={{ fontSize: 12, color: 'var(--red)', fontFamily: 'Outfit, sans-serif', marginBottom: 12 }}>{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: 14, opacity: loading ? 0.6 : 1 }}>
              {loading ? '…' : mode === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)', marginTop: 20 }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError('') }} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 600 }}>
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
