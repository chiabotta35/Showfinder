import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import { getTopArtists } from '@/lib/lastfm'
const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/'
const API_KEY = process.env.LASTFM_API_KEY!
async function getSimilarArtists(artistName: string, limit = 20) {
  try { const u=new URLSearchParams({method:'artist.getSimilar',artist:artistName,api_key:API_KEY,limit:String(limit),autocorrect:'1',format:'json'}); const r=await fetch(`${LASTFM_API}?${u}`,{cache:'no-store'}); const d=await r.json(); return (d.similarartists?.artist??[]).map((a:any)=>({name:a.name,match:parseFloat(a.match),url:a.url})) } catch{return[]}
}
async function getUsername(session: any): Promise<string|null> {
  if (session.userId) { const u=getUserById(session.userId); return u?.lastfmUsername??null }
  return session.lastfm?.username??null
}
export async function GET() {
  const session = await getSession(); const username = await getUsername(session)
  if (!username) return NextResponse.json({noLastfm:true})
  try {
    const [overall,recent] = await Promise.all([getTopArtists(username,'overall',200),getTopArtists(username,'3month',50)])
    const recentNames = new Set(recent.map(a=>a.name.toLowerCase()))
    const drifted = overall.filter(a=>!recentNames.has(a.name.toLowerCase())).slice(0,20).map(a=>({name:a.name,playCount:a.playCount,score:a.score,url:a.url}))
    const seeds = recent.slice(0,30).map(a=>({name:a.name,playCount:a.playCount,score:a.score}))
    return NextResponse.json({drifted,seeds,username})
  } catch(e){console.error(e);return NextResponse.json({error:'Failed'},{status:500})}
}
export async function POST(req: Request) {
  const session = await getSession(); const username = await getUsername(session)
  if (!username) return NextResponse.json({noLastfm:true})
  const body = await req.json().catch(()=>({})); const selectedArtists: string[] = body.artists??[]
  if (selectedArtists.length===0) return NextResponse.json({recommended:[]})
  try {
    const recent = await getTopArtists(username,'3month',50)
    const recentNames = new Set(recent.map(a=>a.name.toLowerCase()))
    const allSimilar = await Promise.all(selectedArtists.map(name=>getSimilarArtists(name,25)))
    const recMap = new Map<string,{name:string;match:number;basedOn:string;url:string;isRediscovery:boolean}>()
    const selectedLower = new Set(selectedArtists.map(a=>a.toLowerCase()))
    for (let i=0;i<selectedArtists.length;i++) { for (const sim of allSimilar[i]) { const key=sim.name.toLowerCase(); if(recentNames.has(key)||selectedLower.has(key)) continue; if(!recMap.has(key)||recMap.get(key)!.match<sim.match) recMap.set(key,{name:sim.name,match:sim.match,basedOn:selectedArtists[i],url:sim.url,isRediscovery:false}) } }
    const overall = await getTopArtists(username,'overall',100)
    const overallNames = new Set(overall.map(a=>a.name.toLowerCase()))
    for (const [key,rec] of recMap) { if(overallNames.has(key)) rec.isRediscovery=true }
    const recommended = Array.from(recMap.values()).sort((a,b)=>b.match-a.match).slice(0,40)
    return NextResponse.json({recommended})
  } catch(e){console.error(e);return NextResponse.json({recommended:[]})}
}
