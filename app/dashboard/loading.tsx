export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 16, width: 180, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 80, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 48, marginBottom: 12 }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 28, width: 90, animationDelay: `${i * 0.04}s` }} />)}
        </div>
      </div>
    </div>
  )
}
