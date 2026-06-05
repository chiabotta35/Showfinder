import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { getPasswordHashByEmail, touchUser } from '@/lib/db'
import { getSession } from '@/lib/session'
const Schema = z.object({ email: z.string().email(), password: z.string().min(1).max(128) })
export async function POST(req: Request) {
  const body = await req.json().catch(()=>null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 })
  const { email, password } = parsed.data
  const record = getPasswordHashByEmail(email)
  const valid = await bcrypt.compare(password, record?.hash ?? '$2a$12$dummy.hash.to.prevent.timing.attacks.padding.here')
  if (!record || !valid) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  touchUser(record.id)
  const session = await getSession(); session.userId = record.id; await session.save()
  return NextResponse.json({ ok: true })
}
