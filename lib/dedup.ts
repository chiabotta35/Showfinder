import type { Show } from '@/types'

const VENUE_SUFFIXES = ['stadium','arena','theatre','theater','center','centre','hall','auditorium','pavilion','amphitheatre','amphitheater','coliseum','fieldhouse','park','garden','gardens','complex','venue']

function normalizeString(s: string): string { return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() }

function normalizeVenue(name: string): string {
  let n = normalizeString(name)
  for (const suffix of VENUE_SUFFIXES) {
    if (n.endsWith(' ' + suffix)) { n = n.slice(0, -(suffix.length + 1)).trim(); break }
  }
  return n
}

function buildDedupeKey(show: Show): string {
  return `${normalizeString(show.artistName)}__${normalizeVenue(show.venue.name)}__${normalizeString(show.venue.city)}__${show.date.slice(0, 10)}`
}

function buildDedupeKeyNeighbors(show: Show): string[] {
  const base = `${normalizeString(show.artistName)}__${normalizeVenue(show.venue.name)}__${normalizeString(show.venue.city)}`
  const date = new Date(show.date)
  return [-1, 0, 1].map(offset => {
    const d = new Date(date.getTime() + offset * 86_400_000)
    return `${base}__${d.toISOString().slice(0, 10)}`
  })
}

function mergeShows(tm: Show, bit: Show): Show {
  return { ...bit, id: `merged_${tm.sourceIds.ticketmaster}_${bit.sourceIds.bandsintown}`, sourceIds: { ticketmaster: tm.sourceIds.ticketmaster, bandsintown: bit.sourceIds.bandsintown }, source: 'both', ticketUrl: tm.ticketUrl ?? bit.ticketUrl, bandsintownUrl: bit.bandsintownUrl, imageUrl: tm.imageUrl ?? bit.imageUrl, priceRange: tm.priceRange ?? bit.priceRange, status: tm.status !== 'unknown' ? tm.status : bit.status, venue: { ...bit.venue, latitude: tm.venue.latitude || bit.venue.latitude, longitude: tm.venue.longitude || bit.venue.longitude, address: tm.venue.address ?? bit.venue.address } }
}

export function deduplicateShows(shows: Show[]): { shows: Show[]; duplicatesRemoved: number } {
  const tmShows = shows.filter(s => s.source === 'ticketmaster')
  const bitShows = shows.filter(s => s.source === 'bandsintown')
  const bitByKey = new Map<string, Show>()
  for (const show of bitShows) { for (const key of buildDedupeKeyNeighbors(show)) { bitByKey.set(key, show) } }
  const merged: Show[] = []
  const usedBitIds = new Set<string>()
  for (const tm of tmShows) {
    const matchingBit = bitByKey.get(buildDedupeKey(tm))
    if (matchingBit && !usedBitIds.has(matchingBit.id)) { merged.push(mergeShows(tm, matchingBit)); usedBitIds.add(matchingBit.id) }
    else merged.push(tm)
  }
  const seenKeys = new Set<string>()
  const tmDeduped = merged.filter(show => { const key = buildDedupeKey(show); if (seenKeys.has(key)) return false; seenKeys.add(key); return true })
  for (const bit of bitShows) { if (!usedBitIds.has(bit.id)) tmDeduped.push(bit) }
  tmDeduped.sort((a, b) => a.date.localeCompare(b.date))
  return { shows: tmDeduped, duplicatesRemoved: shows.length - tmDeduped.length }
}
