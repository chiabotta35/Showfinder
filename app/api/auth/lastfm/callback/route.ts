import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getUserInfo } from '@/lib/lastfm'
import { getSession } from '@/lib/session'
import { upsertUser } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const host = req.headers.get('host') ?? 'localhost:3000'
  const protocol = host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host.split(':')[0]) ? 'http' : 'https'
  const base = `${protocol}://${host}`

  // Read popup mode from cookie (set before Last.fm redirect)
  const cookieHeader = req.headers.get('cookie') ?? ''
  const isPopup = cookieHeader.split(';').some(c => c.trim() === 'sf_popup=1')

  if (!token) {
    return isPopup ? popupResponse('lastfm_auth_failed') : NextResponse.redirect(`${base}/?error=lastfm_denied`)
  }

  try {
    const { key: sessionKey, name: username } = await getLFSession(token)
    const userInfo = await getUserInfo(username)
    const session = await getSession()

    const dbUser = upsertUser({
      lastfmUsername: userInfo.name,
      lastfmSessionKey: sessionKey,
      lastfmDisplayName: userInfo.realname || userInfo.name,
      scrobbleCount: parseInt(userInfo.playcount, 10) || undefined,
      existingUserId: session.userId,
    })

    session.userId = dbUser.id
    session.lastfm = {
      username: userInfo.name,
      sessionKey,
      displayName: userInfo.realname || userInfo.name,
      scrobbleCount: parseInt(userInfo.playcount, 10) || undefined,
    }
    await session.save()

    const response = isPopup ? popupResponse('lastfm_auth_success') : NextResponse.redirect(`${base}/dashboard`)
    if (!isPopup) {
      (response as NextResponse).cookies.set('sf_popup', '', { maxAge: 0, path: '/' })
    }
    return response
  } catch (e) {
    console.error('[lastfm/callback]', e)
    return isPopup ? popupResponse('lastfm_auth_failed') : NextResponse.redirect(`${base}/?error=lastfm_auth_failed`)
  }
}

function popupHtml(msg: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
    (function() {
      try {
        if (window.opener) {
          window.opener.postMessage('${msg}', window.location.origin);
        }
      } catch(e) {}
      setTimeout(function() { window.close(); }, 250);
    })();
  <\/script><p style="font-family:sans-serif;color:#666;text-align:center;margin-top:40px">${msg === 'lastfm_auth_success' ? 'Connected! Closing...' : 'Auth failed. You can close this.'}</p></body></html>`
}

function popupResponse(msg: string) {
  // MUST be a NextResponse so cookies() store mutations from session.save()
  // (and our own Set-Cookie below) are actually attached to the response.
  const response = new NextResponse(popupHtml(msg), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
  response.cookies.set('sf_popup', '', { maxAge: 0, path: '/' })
  return response
}

async function getLFSession(token: string): Promise<{ key: string; name: string }> {
  const AK = process.env.LASTFM_API_KEY!, SS = process.env.LASTFM_SHARED_SECRET!
  const params: Record<string, string> = { method: 'auth.getSession', api_key: AK, token }
  const sig = crypto.createHash('md5')
    .update(Object.keys(params).sort().map(k => `${k}${params[k]}`).join('') + SS, 'utf8')
    .digest('hex')
  const res = await fetch(
    `https://ws.audioscrobbler.com/2.0/?${new URLSearchParams({ ...params, api_sig: sig, format: 'json' })}`,
    { cache: 'no-store' }
  )
  const d = await res.json()
  if (d.error) throw new Error(`Last.fm: ${d.message}`)
  return { key: d.session.key, name: d.session.name }
}
