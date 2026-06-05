import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
export async function GET() {
  const session = await getSession()
  if (session.userId) {
    const user = getUserById(session.userId)
    return NextResponse.json({ lastfmConnected: !!user?.lastfmUsername, displayName: user?.lastfmDisplayName??null, userId: session.userId })
  }
  return NextResponse.json({ lastfmConnected: !!session.lastfm, displayName: session.lastfm?.displayName??null, userId: null })
}
