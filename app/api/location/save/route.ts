import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { updateUserLocation } from '@/lib/db'
const Schema = z.object({city:z.string().min(1).max(100),region:z.string().max(100),latitude:z.number().min(-90).max(90),longitude:z.number().min(-180).max(180)})
export async function POST(req: Request) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ok:false})
  const body = await req.json().catch(()=>null)
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ok:false})
  const {city,region,latitude,longitude} = parsed.data
  updateUserLocation(session.userId, city, region, latitude, longitude)
  return NextResponse.json({ok:true})
}
