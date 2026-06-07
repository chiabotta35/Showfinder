export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: 160, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 16, width: 220, marginBottom: 32 }} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 28, width: 70, animationDelay: `${i * 0.05}s` }} />)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 96, animationDelay: `${i * 0.05}s` }} />)}
        </div>
      </div>
    </div>
  )
}
