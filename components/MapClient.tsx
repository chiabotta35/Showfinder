'use client'
import { useState, useEffect } from 'react'
import NavDock from './NavDock'
import type { UserLocation, Show } from '@/types'
import dynamic from 'next/dynamic'
const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false })

interface Props { location: UserLocation; hubIds: string[] }

export default function MapClient({ location, hubIds }: Props) {
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cacheKey = `shows_${location.city}_${hubIds.join('_')}`
    const cached = localStorage.getItem(cacheKey)
    if (cached) { try { const d = JSON.parse(cached); if (Date.now() - d.ts < 6 * 60 * 60 * 1000) { setShows(d.shows); setLoading(false); return } } catch {} }
    setLoading(false)
  }, [])

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'Outfit' }}>Loading map…</div>

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <LeafletMap shows={shows} center={[location.latitude, location.longitude]} />
      <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(17,17,17,0.9)', border: '1px solid var(--border)', borderRadius: '10px', padding: '8px 16px' }}>
        <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)' }}>{shows.length} shows near {location.city}</p>
      </div>
      <NavDock />
    </div>
  )
}
