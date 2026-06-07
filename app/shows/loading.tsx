export default function Loading() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '40px 16px 20px' }}>
      <div style={{ height: '32px', width: '120px', background: 'var(--surface)', borderRadius: '6px', marginBottom: '20px' }} />
      <div style={{ height: '3px', background: 'var(--surface)', borderRadius: '2px', marginBottom: '24px', overflow: 'hidden' }}>
        <div style={{ width: '40%', height: '100%', background: 'var(--accent)', borderRadius: '2px', animation: 'slide 1.6s ease-in-out infinite' }} />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} style={{ height: '76px', background: 'var(--surface)', borderRadius: '12px', marginBottom: '8px', opacity: 1 - i * 0.1 }} />
      ))}
      <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }`}</style>
    </div>
  )
}
