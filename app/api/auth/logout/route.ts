import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
export async function POST(req: Request) {
  const session = await getSession()
  session.lastfm = undefined; session.userId = undefined
  await session.save()
  return NextResponse.redirect(new URL('/', req.url), { status: 303 })
}
