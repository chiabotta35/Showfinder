import { NextResponse } from 'next/server'
const API_KEY = process.env.LASTFM_API_KEY!
export async function GET(req: Request) {
  const {searchParams} = new URL(req.url)
  const artist = searchParams.get('artist')?.trim(), track = searchParams.get('track')?.trim()
  if (!artist||!track) return NextResponse.json({error:'Missing params'},{status:400})
  try {
    const q = new URLSearchParams({method:'track.getSimilar',artist,track,api_key:API_KEY,format:'json',limit:'20',autocorrect:'1'})
    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?${q}`,{cache:'no-store'})
    const data = await res.json()
    const similar = (data.similartracks?.track??[]).map((t:any)=>({name:t.name,artist:t.artist?.name??artist,match:Math.round(parseFloat(t.match)*100),url:t.url}))
    const artistsMap = new Map<string,{name:string;trackCount:number;url:string}>()
    for (const t of similar) { if (t.artist.toLowerCase()===artist.toLowerCase()) continue; const k=t.artist.toLowerCase(); artistsMap.has(k)?artistsMap.get(k)!.trackCount++:artistsMap.set(k,{name:t.artist,trackCount:1,url:t.url}) }
    const suggestedArtists = Array.from(artistsMap.values()).sort((a,b)=>b.trackCount-a.trackCount).slice(0,10)
    return NextResponse.json({similar,suggestedArtists,sourceTrack:track,sourceArtist:artist})
  } catch(e){return NextResponse.json({similar:[],suggestedArtists:[]})}
}
