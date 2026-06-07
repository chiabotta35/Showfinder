'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import NavDock from './NavDock'

interface Props {
  user: { displayName: string; lastfmUsername: string; createdAt: string; city: string; region: string }
  lastfmConnected: boolean
}

export default function AccountClient({ user, lastfmConnected }: Props) {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)

  async function disconnect() {
    if (!confirm('Disconnect Last.fm? Your saved artists will remain.')) return
    await fetch('/api/account/disconnect', { method: 'POST' })
    router.refresh()
  }

  function connectLastfm() {
    setConnecting(true)
    const w = window.open('/api/auth/lastfm', 'lastfm', 'width=600,height=700')
    const tick = setInterval(() => {
      if (w?.closed) { clearInterval(tick); setConnecting(false); router.refresh() }
    }, 500)
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 120 }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 20px 20px' }}>
        <div style={{ marginBottom: 32, animation: 'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, color: 'var(--text)', letterSpacing: '-1px', marginBottom: 4 }}>Account</h1>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, color: 'var(--text-muted)' }}>Manage your profile and connections.</p>
        </div>

        <div className="card" style={{ padding: 20, marginBottom: 12, animation: 'fadeUp 0.6s 0.1s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Profile</div>
          <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 18, color: 'var(--text)', marginBottom: 4 }}>{user.displayName}</p>
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>@{user.lastfmUsername}</p>
          {user.city && (
            <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{user.city}{user.region ? `, ${user.region}` : ''}</p>
          )}
          <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-faint)', marginTop: 8 }}>Member since {memberSince}</p>
        </div>

        <div className="card" style={{ padding: 20, animation: 'fadeUp 0.6s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
          <div className="section-label" style={{ marginBottom: 12 }}>Connections</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>Last.fm</p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: lastfmConnected ? 'var(--accent)' : 'var(--text-dim)', marginTop: 2 }}>
                {lastfmConnected ? 'Connected' : 'Not connected'}
              </p>
            </div>
            {lastfmConnected ? (
              <button onClick={disconnect} className="btn-ghost" style={{ padding: '8px 14px', fontSize: 12 }}>Disconnect</button>
            ) : (
              <button onClick={connectLastfm} disabled={connecting} className="btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
                {connecting ? '…' : 'Connect'}
              </button>
            )}
          </div>
        </div>

        <div style={{ marginTop: 24, animation: 'fadeUp 0.6s 0.3s cubic-bezier(0.16,1,0.3,1) both' }}>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="btn-ghost" style={{ width: '100%', padding: '12px', fontSize: 13 }}>Sign out</button>
          </form>
        </div>
      </div>
      <NavDock />
    </div>
  )
}
