'use client'
import { useRouter } from 'next/navigation'
import NavDock from './NavDock'

export default function LandingPage() {
  const router = useRouter()
  return (
    <div className="page-header" style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, paddingBottom: 120, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)', opacity: 0.08, pointerEvents: 'none', filter: 'blur(80px)' }} />

      <div style={{ maxWidth: 680, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 800, fontSize: 50, color: 'var(--text)', letterSpacing: '-2px', lineHeight: 1.1, marginBottom: 20, animation: 'fadeUp 0.6s 0.05s cubic-bezier(0.16,1,0.3,1) both' }}>
          Live shows, zero guesswork
        </h1>
        <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 40, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', animation: 'fadeUp 0.6s 0.15s cubic-bezier(0.16,1,0.3,1) both' }}>
          Concerts from your favorite artists, all in one place.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.6s 0.25s cubic-bezier(0.16,1,0.3,1) both' }}>
          <button onClick={() => router.push('/auth')} className="btn-primary" style={{ padding: '14px 28px', fontSize: 15 }}>Get started</button>
          <button onClick={() => router.push('/discover')} className="btn-ghost" style={{ padding: '14px 28px', fontSize: 15 }}>Try without account</button>
        </div>
      </div>

      <div style={{ marginTop: 80, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 720, width: '100%', position: 'relative', zIndex: 1, animation: 'fadeUp 0.6s 0.35s cubic-bezier(0.16,1,0.3,1) both' }}>
        {[
          { name: 'Last.fm', desc: 'Track your scrobbles', color: 'var(--artists-primary)' },
          { name: 'Bandsintown', desc: 'Discover live tours', color: 'var(--discover-primary)' },
          { name: 'Ticketmaster', desc: 'Find show tickets', color: 'var(--shows-primary)' },
        ].map(({ name, desc, color }) => (
          <div key={name} className="card" style={{ padding: 24, textAlign: 'left', borderColor: color + '30', transition: 'border-color 0.2s', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{name}</p>
              <p style={{ fontFamily: 'var(--font-body), sans-serif', fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <style>{`@media (max-width: 640px) { .page-header > div:last-of-type { grid-template-columns: 1fr !important; } }`}</style>
      <NavDock />
    </div>
  )
}
