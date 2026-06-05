import crypto from 'crypto'
import type { LastfmArtist, LastfmUserInfo, LastfmPeriod, ScoredArtist, ArtistSearchResult } from '@/types'

const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/'
const API_KEY = process.env.LASTFM_API_KEY!
const SHARED_SECRET = process.env.LASTFM_SHARED_SECRET!

function buildApiSig(params: Record<string, string>): string {
  const sorted = Object.keys(params).filter(k => k !== 'format' && k !== 'callback').sort()
  const sigString = sorted.map(k => `${k}${params[k]}`).join('') + SHARED_SECRET
  return crypto.createHash('md5').update(sigString, 'utf8').digest('hex')
}

async function lastfmGet<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams({ ...params, api_key: API_KEY, format: 'json' })
  const res = await fetch(`${LASTFM_API}?${query}`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Last.fm HTTP error ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(`Last.fm API error ${data.error}: ${data.message}`)
  return data
}

export function getLastfmAuthUrl(callbackUrl: string): string {
  return `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(callbackUrl)}`
}

export async function getSessionKey(token: string): Promise<string> {
  const params = { method: 'auth.getSession', api_key: API_KEY, token }
  const api_sig = buildApiSig(params)
  const query = new URLSearchParams({ ...params, api_sig, format: 'json' })
  const res = await fetch(`${LASTFM_API}?${query}`, { cache: 'no-store' })
  const data = await res.json()
  if (data.error) throw new Error(`Last.fm auth error ${data.error}: ${data.message}`)
  return data.session.key as string
}

export async function getUserInfo(username: string): Promise<LastfmUserInfo> {
  const data = await lastfmGet<{ user: LastfmUserInfo }>({ method: 'user.getInfo', user: username })
  return data.user
}

export async function getTopArtists(username: string, period: LastfmPeriod = 'overall', limit = 100): Promise<ScoredArtist[]> {
  const data = await lastfmGet<{ topartists: { artist: LastfmArtist[] } }>({
    method: 'user.getTopArtists', user: username, period, limit: String(limit),
  })
  const artists = data.topartists.artist
  if (!artists?.length) return []
  const maxPlays = parseInt(artists[0].playcount, 10) || 1
  return artists.map(a => {
    const plays = parseInt(a.playcount, 10)
    const img = a.image.find(img => img.size === 'extralarge')?.['#text'] || a.image.find(img => img.size === 'large')?.['#text']
    return { name: a.name, score: Math.round((plays / maxPlays) * 100 * 10) / 10, playCount: plays, period, mbid: a.mbid || undefined, url: a.url, imageUrl: img || undefined, source: 'lastfm' as const }
  })
}

export async function searchArtists(query: string, limit = 10): Promise<ArtistSearchResult[]> {
  if (!query.trim()) return []
  const data = await lastfmGet<{ results: { artistmatches: { artist: ArtistSearchResult[] } } }>({
    method: 'artist.search', artist: query.trim(), limit: String(limit),
  })
  return data.results.artistmatches.artist ?? []
}

export async function getArtistInfo(artistName: string): Promise<{ name: string; imageUrl?: string; mbid?: string; url?: string } | null> {
  try {
    const data = await lastfmGet<{ artist: { name: string; mbid: string; url: string; image: { '#text': string; size: string }[] } }>({
      method: 'artist.getInfo', artist: artistName, autocorrect: '1',
    })
    const img = data.artist.image.find(img => img.size === 'extralarge')?.['#text'] || data.artist.image.find(img => img.size === 'large')?.['#text']
    return { name: data.artist.name, mbid: data.artist.mbid || undefined, url: data.artist.url, imageUrl: img || undefined }
  } catch { return null }
}
