import { NextResponse } from 'next/server'
import { getNearestHubs } from '@/lib/location'
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const HEADERS = { 'User-Agent': 'ShowFinder/1.0', 'Accept-Language': 'en-US,en' }
export async function GET(req: Request) {
  const {searchParams} = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat')??''), lng = parseFloat(searchParams.get('lng')??'')
  if (isNaN(lat)||isNaN(lng)) return NextResponse.json({error:'Invalid coordinates'},{status:400})
  try {
    const res = await fetch(`${NOMINATIM}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10&addressdetails=1`,{headers:HEADERS,cache:'no-store'})
    const data = await res.json(); const addr = data.address??{}
    const city = addr.city||addr.town||addr.village||addr.municipality||addr.county||'Unknown'
    return NextResponse.json({city,region:addr.state??'',country:addr.country_code?.toUpperCase()??'US',latitude:lat,longitude:lng,suggestedHubs:getNearestHubs(lat,lng,5)})
  } catch(e){return NextResponse.json({error:'Geocoding failed'},{status:500})}
}
export async function POST(req: Request) {
  const body = await req.json().catch(()=>null)
  const query = body?.query?.trim()
  if (!query||query.length<1) return NextResponse.json({results:[]})
  try {
    const usRes = await fetch(`${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&countrycodes=us,ca&accept-language=en`,{headers:HEADERS,cache:'no-store'})
    let data = await usRes.json()
    if (data.length<2) { const gRes = await fetch(`${NOMINATIM}/search?q=${encodeURIComponent(query)}&format=json&limit=6&addressdetails=1&accept-language=en`,{headers:HEADERS,cache:'no-store'}); data = await gRes.json() }
    const seen = new Set<string>()
    const results = data.map((r:any)=>{const addr=r.address??{};const city=addr.city||addr.town||addr.village||addr.municipality||addr.county||r.name;const parts=[city,addr.state,addr.country].filter(Boolean);return{displayName:parts.join(', '),latitude:parseFloat(r.lat),longitude:parseFloat(r.lon),importance:r.importance??0}}).filter((r:any)=>{if(!r.displayName||seen.has(r.displayName))return false;seen.add(r.displayName);return true}).sort((a:any,b:any)=>b.importance-a.importance).slice(0,6).map(({displayName,latitude,longitude}:any)=>({displayName,latitude,longitude}))
    return NextResponse.json({results})
  } catch(e){return NextResponse.json({results:[]})}
}
