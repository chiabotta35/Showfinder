import { getIronSession, IronSession } from 'iron-session'
import { cookies } from 'next/headers'
import type { SessionData } from '@/types'

export const SESSION_OPTIONS = {
  cookieName: 'showfinder_session',
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 90,
    sameSite: 'lax' as const,
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), SESSION_OPTIONS)
}
