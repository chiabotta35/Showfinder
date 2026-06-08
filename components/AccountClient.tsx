'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Shell from './Shell'
import { useSettings } from './SettingsContext'

interface Props {
  user: { displayName: string; lastfmUsername: string; createdAt: string; city: string; region: string }
  lastfmConnected: boolean
}

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = [...name].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
  const bg = `hsl(${Math.abs(hue) % 360}, 50%, 35%)`
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.3, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

export default function AccountClient({ user, lastfmConnected }: Props) {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const { settings } = useSettings()

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
    <Shell route="account">
      <div className="page account">
        <header className="page-head">
          <h1 className="page-title">Account</h1>
        </header>

        <div className="profile-card">
          <Avatar name={user.displayName} size={60} />
          <div className="pc-info">
            <b>{user.displayName}</b>
            <span>@{user.lastfmUsername}</span>
          </div>
        </div>

        <div className="connection-card">
          <div className="cc-left">
            <div className="lastfm-mark" style={{ background: '#b90000' }}>fm</div>
            <div className="cc-text">
              <b>Last.fm</b>
              <span>{lastfmConnected ? `@${user.lastfmUsername}` : 'Not connected'}</span>
            </div>
          </div>
          {lastfmConnected ? (
            <button className="conn-status on" onClick={disconnect}>
              <span className="status-dot" style={{ background: 'var(--accent)' }} />Connected
            </button>
          ) : (
            <button className="conn-status" onClick={connectLastfm} disabled={connecting}>
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>

        <div className="info-grid">
          <div className="info-tile">
            <span className="it-label">Home city</span>
            <b>{user.city || '—'}{user.region ? `, ${user.region}` : ''}</b>
          </div>
          <div className="info-tile">
            <span className="it-label">Member since</span>
            <b>{memberSince}</b>
          </div>
          <div className="info-tile">
            <span className="it-label">Theme</span>
            <b style={{ textTransform: 'capitalize' }}>{settings.theme}</b>
          </div>
          <div className="info-tile">
            <span className="it-label">Card layout</span>
            <b style={{ textTransform: 'capitalize' }}>{settings.showsCardLayout}</b>
          </div>
        </div>

        <div className="session-block">
          <div className="sb-row"><span>Session</span><b>iron-session · secure</b></div>
          <div className="sb-row"><span>Caching</span><b>30 min local · per-hub DB</b></div>
          <div className="sb-row"><span>Version</span><b>ShowFinder 2.4.0</b></div>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button type="submit" className="signout-btn">Sign out</button>
        </form>
      </div>
    </Shell>
  )
}
