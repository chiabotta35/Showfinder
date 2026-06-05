import { NextResponse } from 'next/server'
import { searchArtists } from '@/lib/lastfm'
const MIN_LISTENERS = 5000
export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get('q')?.trim()??''
  if (!query||query.length<1) return NextResponse.json({results:[]})
  try {
    const results = await searchArtists(query, 20)
    const filtered = results.filter(r=>r.name&&parseInt(r.listeners)>=MIN_LISTENERS)
      .sort((a,b)=>{const q=query.toLowerCase(),an=a.name.toLowerCase(),bn=b.name.toLowerCase();const as=an===q?2:an.startsWith(q)?1:0,bs=bn===q?2:bn.startsWith(q)?1:0;return as!==bs?bs-as:parseInt(b.listeners)-parseInt(a.listeners)}).slice(0,7)
    return NextResponse.json({results:filtered})
  } catch(e){console.error(e);return NextResponse.json({error:'Search failed'},{status:500})}
}
