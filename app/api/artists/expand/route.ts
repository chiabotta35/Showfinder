import { NextResponse } from 'next/server'
const API_KEY = process.env.LASTFM_API_KEY!
const BASE = 'https://ws.audioscrobbler.com/2.0/'
async function lfm(params: Record<string,string>) {
  const q = new URLSearchParams({...params,api_key:API_KEY,format:'json'})
  const res = await fetch(`${BASE}?${q}`,{cache:'no-store'}); return res.json()
}
export async function GET(req: Request) {
  const artist = new URL(req.url).searchParams.get('artist')?.trim()
  if (!artist) return NextResponse.json({error:'Missing artist'},{status:400})
  const [similarData,tracksData] = await Promise.allSettled([lfm({method:'artist.getSimilar',artist,limit:'12',autocorrect:'1'}),lfm({method:'artist.getTopTracks',artist,limit:'10',autocorrect:'1'})])
  const similar = similarData.status==='fulfilled'?(similarData.value.similarartists?.artist??[]).map((a:any)=>({name:a.name,match:Math.round(parseFloat(a.match)*100),url:a.url})):[]
  const tracks = tracksData.status==='fulfilled'?(tracksData.value.toptracks?.track??[]).map((t:any)=>({name:t.name,playcount:parseInt(t.playcount),url:t.url})):[]
  return NextResponse.json({similar,tracks})
}
