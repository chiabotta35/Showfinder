import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createUserWithPassword, getUserByEmail } from '@/lib/db'
import { getSession } from '@/lib/session'
const Schema = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(128), displayName: z.string().min(1).max(60) })
export async function POST(req: Request) {
  const body = await req.json().catch(()=>null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message??'Invalid input' }, { status: 400 })
  const { email, password, displayName } = parsed.data
  if (getUserByEmail(email)) return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 })
  const user = createUserWithPassword(email, await bcrypt.hash(password, 12), displayName)
  const session = await getSession(); session.userId = user.id; await session.save()
  return NextResponse.json({ ok: true })
}
