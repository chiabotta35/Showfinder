import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { updateUserPreferences } from '@/lib/db'
const Schema = z.object({timeFormat:z.enum(['12h','24h']).optional()})
export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({error:'Not signed in'},{status:401})
  const parsed = Schema.safeParse(await req.json().catch(()=>null))
  if (!parsed.success) return NextResponse.json({error:'Invalid'},{status:400})
  updateUserPreferences(session.userId, parsed.data)
  return NextResponse.json({ok:true})
}
