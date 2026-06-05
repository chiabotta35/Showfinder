export interface SessionData {
  userId?: string
  lastfm?: { username: string; sessionKey: string; displayName: string; imageUrl?: string; scrobbleCount?: number }
  savedArtists?: { name: string; mbid?: string; imageUrl?: string; addedAt: string }[]
}
export interface ScoredArtist {
  name: string; score: number; playCount?: number; period?: LastfmPeriod
  mbid?: string; url?: string; imageUrl?: string; source: 'lastfm' | 'manual'
}
export interface SavedArtist { name: string; mbid?: string; imageUrl?: string; addedAt: string }
export type LastfmPeriod = 'overall' | '12month' | '6month' | '3month' | '1month' | '7day'
export interface LastfmArtist {
  name: string; playcount: string; rank: string; mbid: string; url: string
  image: { '#text': string; size: string }[]
}
export interface LastfmUserInfo {
  name: string; realname: string; image: { '#text': string; size: string }[]
  playcount: string; url: string; registered: { '#text': string; unixtime: string }
}
export type EventSource = 'bandsintown' | 'ticketmaster' | 'both'
export interface Venue {
  id: string; name: string; city: string; region: string; country: string
  latitude: number; longitude: number; address?: string
}
export interface Show {
  id: string; sourceIds: { bandsintown?: string; ticketmaster?: string }
  source: EventSource; artistName: string; venue: Venue
  date: string; startTime?: string; ticketUrl?: string; bandsintownUrl?: string
  imageUrl?: string; status: 'onsale' | 'offsale' | 'cancelled' | 'postponed' | 'rescheduled' | 'unknown'
  priceRange?: { min: number; max: number; currency: string }
  isFestival: boolean; isTribute: boolean
}
export interface UserLocation { city: string; region: string; country: string; latitude: number; longitude: number }
export interface TouringHub { id: string; name: string; latitude: number; longitude: number; region: string }
export interface LocationFilter { homeLocation: UserLocation; enabledHubs: TouringHub[]; radiusMiles?: number }
export interface ArtistsResponse { artists: ScoredArtist[]; totalTracked: number; lastfmConnected: boolean; period?: LastfmPeriod }
export interface ShowsResponse { shows: Show[]; totalFound: number; deduplicatedCount: number; locationFilter: LocationFilter; fromCache?: boolean }
export interface ArtistSearchResult { name: string; listeners: string; mbid: string; url: string; image: { '#text': string; size: string }[] }
