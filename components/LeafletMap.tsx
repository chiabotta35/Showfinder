'use client'
import { useEffect, useRef } from 'react'
import type { Show } from '@/types'

interface Props { shows: Show[]; center: [number, number] }

export default function LeafletMap({ shows, center }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return
    import('leaflet').then(L => {
      const el = ref.current!
      if ((el as any)._leaflet_id) { (el as any)._leaflet_id = null }
      const map = L.map(el).setView(center, 9)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors' }).addTo(map)
      shows.forEach(show => {
        if (!show.venue.latitude || !show.venue.longitude) return
        L.marker([show.venue.latitude, show.venue.longitude])
          .addTo(map)
          .bindPopup(`<b>${show.artistName}</b><br>${show.venue.name}<br>${show.venue.city}<br>${show.date}`)
      })
      mapRef.current = map
    })
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [shows])

  return <div ref={ref} style={{ width: '100%', height: '100%' }} />
}
