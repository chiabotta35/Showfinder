'use client'
import { useState, useEffect } from 'react'
import NavDock from './NavDock'
import LocationBar from './LocationBar'
import ArtistSearch from './ArtistSearch'
import type { ScoredArtist, UserLocation, TouringHub } from '@/types'

interface Props {
  lastfmUser: { username: string; displayName: string; timeFormat?: string } | null
  savedLocation?: { city: string; region: string; lat: number; lng: number } | null
}

export default function Dashboard({ lastfmUser, savedLocation }: Props) {
  const [artists, setArtists] = useState<ScoredArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<string>('overall')
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [hubs, setHubs] = useState<TouringHub[]>([])
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [expandData, setExpandData] = useState<Record<string, any>>({})

  useEffect(() => { loadArtists() }, [period])

  async function loadArtists() {
    setLoading(true)
    const res = await fetch(`/api/artists?period=${period}`)
    const data = await res.json()
    setArtists(data.artists ?? [])
    setSavedNames(new Set(data.artists?.filter((a: ScoredArtist) => a.source === 'manual').map((a: ScoredArtist) => a.name.toLowerCase()) ?? []))
    setLoading(false)
  }

  async function expandArtist(name: string) {
    if (expanded === name) { setExpanded(null); return }
    setExpanded(name)
    if (expandData[name]) return
    const res = await fetch(`/api/artists/expand?artist=${encodeURIComponent(name)}`)
    const data = await res.json()
    setExpandData(prev => ({ ...prev, [name]: data }))
  }

  async function addArtist(name: string, mbid?: string) {
    await fetch('/api/artists/saved', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mbid }) })
    loadArtists()
  }

  async function removeArtist(name: string) {
    await fetch('/api/artists/saved', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    loadArtists()
  }

  function goToShows() {
    if (!location) return
    const params = new URLSearchParams({ lat: String(location.latitude), lng: String(location.longitude), city: location.city, region: location.region, country: location.country, hubs: hubs.map(h => h.id).join(',') })
    const url = `/shows?${params}`
    localStorage.setItem('lastShowsUrl', url)
    window.location.href = url
  }

  const periods = [['7day','7 days'],['1month','1 month'],['3month','3 months'],['6month','6 months'],['12month','1 year'],['overall','All time']]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: '120px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '40px 16px 20px' }}>
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '26px', color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: '4px' }}>My Artists</h1>
          {lastfmUser && <p style={{ fontFamily: 'Outfit', fontSize: '13px', color: 'var(--text-muted)' }}>Connected as {lastfmUser.displayName}</p>}
        </div>

        <LocationBar savedLocation={savedLocation} onLocationChange={(loc, h) => { setLocation(loc); setHubs(h) }} />
        <ArtistSearch onAdd={addArtist} savedNames={savedNames} />

        {lastfmUser && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {periods.map(([val, label]) => (
              <button key={val} onClick={() => setPeriod(val)} style={{ fontSize: '11px', fontFamily: 'Outfit', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: period === val ? 'var(--accent)' : 'var(--surface)', color: period === val ? '#000' : 'var(--text-muted)', cursor: 'pointer', fontWeight: period === val ? 600 : 400 }}>{label}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-dim)', fontFamily: 'Outfit', fontSize: '14px' }}>Loading artists…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {artists.map((artist, i) => {
              const isExpanded = expanded === artist.name
              const ed = expandData[artist.name]
              return (
                <div key={artist.name} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div onClick={() => expandArtist(artist.name)} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', gap: '12px' }}>
                    <span style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '11px', color: 'var(--text-dim)', minWidth: '22px' }}>#{i + 1}</span>
                    <span style={{ flex: 1, fontFamily: 'Outfit', fontSize: '14px', color: 'var(--text)', fontWeight: 500 }}>{artist.name}</span>
                    {artist.playCount && <span style={{ fontSize: '11px', color: 'var(--text-dim)', fontFamily: 'Outfit' }}>{artist.playCount.toLocaleString()} plays</span>}
                    {artist.source === 'manual' && (
                      <button onClick={e => { e.stopPropagation(); removeArtist(artist.name) }} style={{ fontSize: '10px', color: 'var(--text-dim)', background: 'none', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontFamily: 'Outfit' }}>remove</button>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{isExpanded ? '▲' : '▼'}</span>
                  </div>
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '14px', display: 'flex', gap: '20px' }}>
                      {ed ? (
                        <>
                          {ed.similar?.length > 0 && (
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'Syne', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Similar</p>
                              {ed.similar.slice(0, 6).map((s: any) => <div key={s.name} style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Outfit', padding: '2px 0' }}>{s.name}</div>)}
                            </div>
                          )}
                          {ed.tracks?.length > 0 && (
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: '11px', color: 'var(--accent)', fontFamily: 'Syne', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>Top Tracks</p>
                              {ed.tracks.slice(0, 6).map((t: any) => <div key={t.name} style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'Outfit', padding: '2px 0' }}>{t.name}</div>)}
                            </div>
                          )}
                        </>
                      ) : (
                        <p style={{ fontSize: '13px', color: 'var(--text-dim)', fontFamily: 'Outfit' }}>Loading…</p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {location && artists.length > 0 && (
          <div style={{ position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)', zIndex: 500 }}>
            <button onClick={goToShows} style={{ background: 'var(--accent)', color: '#000', border: 'none', borderRadius: '12px', padding: '14px 28px', fontFamily: 'Syne', fontWeight: 800, fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 20px rgba(200,255,87,0.3)', whiteSpace: 'nowrap' }}>
              Find Shows Near {location.city} →
            </button>
          </div>
        )}
      </div>
      <NavDock />
    </div>
  )
}
