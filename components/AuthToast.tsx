'use client'
import { useEffect, useState } from 'react'

interface Toast {
  id: number
  status: 'success' | 'failed'
  message: string
}

export default function AuthToast() {
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return
      if (e.data.type !== 'lastfm-auth') return
      const status = e.data.status === 'lastfm_auth_success' ? 'success' : 'failed'
      const id = Date.now()
      setToast({
        id,
        status,
        message: status === 'success' ? 'Last.fm connected' : 'Last.fm auth failed — please try again',
      })
      // If the user has a session now, reload so the UI updates.
      if (status === 'success') setTimeout(() => window.location.reload(), 1200)
      setTimeout(() => setToast(t => (t && t.id === id ? null : t)), 5000)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  if (!toast) return null

  const isError = toast.status === 'failed'

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--surface)',
        border: `1px solid ${isError ? 'var(--red)' : 'var(--accent)'}`,
        borderRadius: 'var(--r-md)',
        padding: '12px 16px',
        boxShadow: 'var(--shadow-md)',
        maxWidth: 360,
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        fontFamily: 'Outfit, sans-serif',
        fontSize: 13,
        color: 'var(--text)',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: isError ? 'var(--red)' : 'var(--accent)',
          flexShrink: 0,
        }}
      />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => setToast(null)}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
          fontFamily: 'inherit',
        }}
      >×</button>
    </div>
  )
}
