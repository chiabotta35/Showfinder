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
    return isPopup ? popup('lastfm_auth_failed') : NextResponse.redirect(`${base}/?error=lastfm_denied`)
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

    // Clear the popup cookie
    const response = isPopup ? popup('lastfm_auth_success') : NextResponse.redirect(`${base}/dashboard`)
    if (isPopup) {
      // For popup response we need to set cookie via headers
    } else {
      (response as NextResponse).cookies.set('sf_popup', '', { maxAge: 0 })
    }
    return response
  } catch (e) {
    console.error('[lastfm/callback]', e)
    return isPopup ? popup('lastfm_auth_failed') : NextResponse.redirect(`${base}/?error=lastfm_auth_failed`)
  }
}

function popup(msg: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
    (function() {
      try { window.opener.postMessage('${msg}', '*'); } catch(e) {}
      setTimeout(function() { window.close(); }, 100);
    })();
  <\/script><p style="font-family:sans-serif;color:#666;text-align:center;margin-top:40px">${msg === 'lastfm_auth_success' ? 'Connected! Closing...' : 'Auth failed. You can close this.'}</p></body></html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html' } })
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
