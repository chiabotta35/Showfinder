export default function Loading() {
  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 16px 20px' }}>
      <div style={{ height: '32px', width: '180px', background: 'var(--surface)', borderRadius: '6px', marginBottom: '24px' }} />
      <div style={{ height: '44px', background: 'var(--surface)', borderRadius: '10px', marginBottom: '12px' }} />
      <div style={{ height: '44px', background: 'var(--surface)', borderRadius: '10px', marginBottom: '24px' }} />
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {Array.from({ length: 6 }).map((_, i) => <div key={i} style={{ height: '28px', width: '60px', background: 'var(--surface)', borderRadius: '6px' }} />)}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ height: '48px', background: 'var(--surface)', borderRadius: '10px', marginBottom: '2px', opacity: 1 - i * 0.08 }} />
      ))}
    </div>
  )
}
