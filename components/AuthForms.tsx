'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle = { width: '100%', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 14px', color: 'var(--text)', fontFamily: 'Outfit', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }
const labelStyle = { display: 'block', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Outfit', marginBottom: '6px', fontWeight: 500 }
const btnStyle = { width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '8px', padding: '11px', fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', cursor: 'pointer', marginTop: '8px' }
const errStyle = { background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#ff8080', fontFamily: 'Outfit' }

export function SignupForm() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Something went wrong'); setLoading(false); return }
    router.push('/dashboard')
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && <div style={errStyle}>{error}</div>}
      <div><label style={labelStyle}>Display name</label><input style={inputStyle} value={form.displayName} onChange={set('displayName')} required /></div>
      <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set('email')} required /></div>
      <div><label style={labelStyle}>Password</label><input style={inputStyle} type="password" value={form.password} onChange={set('password')} minLength={8} required /></div>
      <button style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }} disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</button>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Outfit', marginTop: '4px' }}>Already have an account? <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</a></p>
    </form>
  )
}

export function LoginForm() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }))
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    const res = await fetch('/api/auth/login-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (!res.ok) { setError(data.error ?? 'Invalid email or password'); setLoading(false); return }
    router.push('/dashboard')
  }
  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {error && <div style={errStyle}>{error}</div>}
      <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={set('email')} required /></div>
      <div><label style={labelStyle}>Password</label><input style={inputStyle} type="password" value={form.password} onChange={set('password')} required /></div>
      <button style={{ ...btnStyle, opacity: loading ? 0.6 : 1 }} disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
      <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Outfit', marginTop: '4px' }}>No account? <a href="/signup" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Create one</a></p>
    </form>
  )
}
