export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: 140, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 140, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 80 }} />
      </div>
    </div>
  )
}
