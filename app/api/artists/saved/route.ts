import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { addSavedArtist, removeSavedArtist } from '@/lib/db'
const AddSchema = z.object({name:z.string().min(1).max(200),mbid:z.string().max(36).optional(),imageUrl:z.string().url().optional()})
const RemoveSchema = z.object({name:z.string().min(1).max(200)})
export async function POST(req: Request) {
  const session = await getSession()
  const body = await req.json().catch(()=>null)
  const parsed = AddSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({error:'Invalid request'},{status:400})
  const {name,mbid} = parsed.data
  if (session.userId) { addSavedArtist(session.userId, name, mbid) }
  else { const saved=session.savedArtists??[]; if(!saved.some(a=>a.name.toLowerCase()===name.toLowerCase())&&saved.length<200){session.savedArtists=[...saved,{name,mbid,addedAt:new Date().toISOString()}];await session.save()} }
  return NextResponse.json({ok:true})
}
export async function DELETE(req: Request) {
  const session = await getSession()
  const body = await req.json().catch(()=>null)
  const parsed = RemoveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({error:'Invalid request'},{status:400})
  if (session.userId) { removeSavedArtist(session.userId, parsed.data.name) }
  else { session.savedArtists=(session.savedArtists??[]).filter(a=>a.name.toLowerCase()!==parsed.data.name.toLowerCase());await session.save() }
  return NextResponse.json({ok:true})
}
