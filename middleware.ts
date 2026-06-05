import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
const ipRequestCounts = new Map<string, { count: number; windowStart: number }>()
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 120
function getRealIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1'
}
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = ipRequestCounts.get(ip)
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRequestCounts.set(ip, { count: 1, windowStart: now }); return false
  }
  record.count += 1
  return record.count > RATE_LIMIT_MAX
}
export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    if (isRateLimited(getRealIp(req))) {
      return new NextResponse('Too Many Requests', { status: 429, headers: { 'Retry-After': '60' } })
    }
  }
  return NextResponse.next()
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'] }
