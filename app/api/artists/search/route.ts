import { NextResponse } from 'next/server'
import { searchArtists } from '@/lib/lastfm'

const MIN_LISTENERS = 5000

async function handleSearch(rawQuery: string) {
  const query = rawQuery.trim()
  if (!query || query.length < 1) return NextResponse.json({ artists: [] })
  try {
    const results = await searchArtists(query, 20)
    const filtered = results
      .filter(r => r.name && parseInt(r.listeners) >= MIN_LISTENERS)
      .sort((a, b) => {
        const q = query.toLowerCase()
        const an = a.name.toLowerCase()
        const bn = b.name.toLowerCase()
        const as = an === q ? 2 : an.startsWith(q) ? 1 : 0
        const bs = bn === q ? 2 : bn.startsWith(q) ? 1 : 0
        if (as !== bs) return bs - as
        return parseInt(b.listeners) - parseInt(a.listeners)
      })
      .slice(0, 7)
      .map(r => ({ name: r.name, mbid: r.mbid || undefined, listeners: parseInt(r.listeners) }))
    return NextResponse.json({ artists: filtered })
  } catch (e) {
    console.error('[artists/search]', e)
    return NextResponse.json({ artists: [], error: 'Search failed' }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get('q') ?? ''
  return handleSearch(query)
}

export async function POST(req: Request) {
  let body: { query?: string } = {}
  try { body = await req.json() } catch {}
  return handleSearch(body.query ?? '')
}
