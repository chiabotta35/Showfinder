export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 16, width: 140, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 48, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 28, width: 56, animationDelay: `${i * 0.05}s` }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 56, animationDelay: `${i * 0.05}s` }} />)}
        </div>
      </div>
    </div>
  )
}
