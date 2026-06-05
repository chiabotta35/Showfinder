'use client'
import NavDock from './NavDock'
import { useState } from 'react'

interface Props {
  lastfmUser: { username: string; displayName: string; scrobbleCount?: number; timeFormat?: string } | null
  savedArtistCount: number
}

export default function AccountClient({ lastfmUser, savedArtistCount }: Props) {
  const [timeFormat, setTimeFormat] = useState(lastfmUser?.timeFormat ?? '12h')
  const [saving, setSaving] = useState(false)

  async function savePrefs(fmt: '12h' | '24h') {
    setTimeFormat(fmt); setSaving(true)
    await fetch('/api/account/preferences', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeFormat: fmt }) })
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '100px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '48px 20px 20px' }}>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '28px', color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: '28px' }}>Account</h1>

        {lastfmUser ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>{lastfmUser.displayName}</p>
                <p style={{ fontFamily: 'Outfit', fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>@{lastfmUser.username} on Last.fm</p>
                {lastfmUser.scrobbleCount && <p style={{ fontFamily: 'Outfit', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>{lastfmUser.scrobbleCount.toLocaleString()} scrobbles</p>}
              </div>
              <a href="/api/auth/lastfm?popup=0" style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'Outfit', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 10px' }}>Reconnect</a>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
            <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '8px' }}>Connect Last.fm</p>
            <a href="/api/auth/lastfm" style={{ display: 'inline-block', background: 'var(--accent)', color: '#000', borderRadius: '8px', padding: '8px 16px', fontFamily: 'Syne', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>Connect</a>
          </div>
        )}

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '12px' }}>Preferences</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)' }}>Time format</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['12h','24h'] as const).map(fmt => (
                <button key={fmt} onClick={() => savePrefs(fmt)} style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: timeFormat === fmt ? 'var(--accent)' : 'var(--surface-2)', color: timeFormat === fmt ? '#000' : 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '12px', cursor: 'pointer', fontWeight: timeFormat === fmt ? 600 : 400 }}>{fmt}</button>
              ))}
            </div>
          </div>
          {saving && <p style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'Outfit', marginTop: '8px' }}>Saved</p>}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '16px' }}>
          <p style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>Stats</p>
          <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)' }}>{savedArtistCount} manually saved artists</p>
        </div>

        <form action="/api/auth/logout" method="POST">
          <button type="submit" style={{ width: '100%', background: 'none', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '10px', padding: '12px', fontFamily: 'Outfit', fontSize: '13px', color: 'var(--red)', cursor: 'pointer' }}>Sign out</button>
        </form>
      </div>
      <NavDock />
    </div>
  )
}
