'use client'
import { useRouter } from 'next/navigation'
import NavDock from './NavDock'

export default function LandingPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, paddingBottom: 100 }}>
      <div style={{ maxWidth: 540, textAlign: 'center' }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, color: 'var(--accent)', letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16, animation: 'fadeUp 0.5s cubic-bezier(0.16,1,0.3,1)' }}>ShowFinder</p>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 56, color: 'var(--text)', letterSpacing: '-2px', lineHeight: 1, marginBottom: 20, animation: 'fadeUp 0.6s 0.05s cubic-bezier(0.16,1,0.3,1) both' }}>
          Live shows,<br/><span style={{ color: 'var(--accent)' }}>zero</span> guesswork.
        </h1>
        <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 36, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto', animation: 'fadeUp 0.6s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>
          Connect your Last.fm and we'll find concerts near you for the artists you actually listen to.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.6s 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
          <button onClick={() => router.push('/auth')} className="btn-primary" style={{ padding: '14px 28px', fontSize: 15 }}>Get started</button>
          <button onClick={() => router.push('/discover')} className="btn-ghost" style={{ padding: '14px 28px', fontSize: 15 }}>Try without account</button>
        </div>
        <div style={{ marginTop: 60, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, animation: 'fadeUp 0.6s 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
          {[['Last.fm', 'Scrobbles'],['Bandsintown', 'Tours'],['Ticketmaster', 'Tickets']].map(([name, kind]) => (
            <div key={name} className="card" style={{ padding: 14, textAlign: 'left' }}>
              <p style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>{name}</p>
              <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: 11, color: 'var(--text-dim)' }}>{kind}</p>
            </div>
          ))}
        </div>
      </div>
      <NavDock />
    </div>
  )
}
