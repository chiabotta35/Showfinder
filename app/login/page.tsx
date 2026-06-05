import { LoginForm } from '@/components/AuthForms'
export default function LoginPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <a href="/" style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '18px', color: 'var(--text)', textDecoration: 'none', display: 'block', marginBottom: '32px' }}>SHOWFINDER</a>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '28px', color: 'var(--text)', marginBottom: '6px' }}>Sign in</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'Outfit', marginBottom: '28px' }}>Welcome back.</p>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}><LoginForm /></div>
        <div style={{ marginTop: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Outfit', marginBottom: '10px' }}>Or continue with Last.fm</p>
          <a href="/api/auth/lastfm" style={{ display: 'block', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '8px', padding: '9px', color: 'var(--text-muted)', fontFamily: 'Outfit', fontSize: '13px', textDecoration: 'none' }}>Connect Last.fm</a>
        </div>
      </div>
    </div>
  )
}
