import { SignupForm } from '@/components/AuthForms'
export default function SignupPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <a href="/" style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '18px', color: 'var(--text)', textDecoration: 'none', display: 'block', marginBottom: '32px' }}>SHOWFINDER</a>
        <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '28px', color: 'var(--text)', marginBottom: '6px' }}>Create account</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', fontFamily: 'Outfit', marginBottom: '28px' }}>Save your artists across devices.</p>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}><SignupForm /></div>
      </div>
    </div>
  )
}
