export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
    </div>
  )
}
