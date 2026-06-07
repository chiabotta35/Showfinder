export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '80px 20px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 32, width: 180, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 16, width: 200, marginBottom: 32 }} />
        <div className="skeleton" style={{ height: 48, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    </div>
  )
}
