import { NextResponse } from 'next/server'
import { getLastfmAuthUrl } from '@/lib/lastfm'

export async function GET(req: Request) {
  const isPopup = new URL(req.url).searchParams.get('popup') === '1'
  const host = req.headers.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host.split(':')[0]) ? 'http' : 'https'
  const base = `${protocol}://${host}`

  // IMPORTANT: do NOT put ?popup=1 in the callback URL.
  // Last.fm appends ?token=TOKEN to the callback URL, so if we have
  // ?popup=1 already, it becomes ?popup=1?token=TOKEN which breaks parsing.
  // Instead, store popup mode in a short-lived cookie.
  const callbackUrl = `${base}/api/auth/lastfm/callback`
  const response = NextResponse.redirect(getLastfmAuthUrl(callbackUrl))
  if (isPopup) {
    response.cookies.set('sf_popup', '1', { httpOnly: true, maxAge: 300, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' })
  }
  return response
}
