import type { Metadata } from 'next'
import { Arimo, Space_Grotesk, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'

const arimo = Arimo({ subsets: ['latin'], variable: '--font-body', weight: ['400', '500', '600', '700'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading', weight: ['400', '500', '600', '700'] })
const ibmPlexSans = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-fallback', weight: ['400', '500', '600'] })

export const metadata: Metadata = {
  title: 'ShowFinder — Find concerts from your music',
  description: 'Discover upcoming shows from the artists you actually listen to.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const themeScript = `
(function(){
  try {
    var s = JSON.parse(localStorage.getItem('showfinder_settings') || '{}');
    var id = s.theme || 'teal';
    var cw = {"teal":{"bg":"#0d1011","surface":"#15191b","surface2":"#1d2326","border":"#2a3236","text":"#eef2f3","dim":"#9aa6ab","faint":"#5e6a6f","accent":"#2dd4bf","accentInk":"#04201c"},"amber":{"bg":"#100d0a","surface":"#1a1611","surface2":"#241e17","border":"#332a20","text":"#f4efe8","dim":"#ab9f90","faint":"#6f6354","accent":"#f5a623","accentInk":"#241600"},"violet":{"bg":"#0c0c14","surface":"#15151f","surface2":"#1d1d2c","border":"#2a2a3d","text":"#edecf5","dim":"#9b9ab0","faint":"#5f5f78","accent":"#8b7cff","accentInk":"#120a2e"},"neon":{"bg":"#000000","surface":"#0c0e0c","surface2":"#141814","border":"#1f261f","text":"#eafaef","dim":"#8fa395","faint":"#566059","accent":"#46f08a","accentInk":"#022012"},"coral":{"bg":"#120e0d","surface":"#1c1614","surface2":"#261d1a","border":"#352824","text":"#f6efec","dim":"#b09b94","faint":"#736159","accent":"#ff6f5e","accentInk":"#2c0c07"},"sky":{"bg":"#0b0e12","surface":"#13171d","surface2":"#1a2029","border":"#283038","text":"#eaf0f6","dim":"#94a1b0","faint":"#5a6573","accent":"#4aa8ff","accentInk":"#04182e"},"magenta":{"bg":"#110b10","surface":"#1a131a","surface2":"#241a24","border":"#342634","text":"#f4ecf3","dim":"#ad95ab","faint":"#71596f","accent":"#ff5db1","accentInk":"#2e0820"},"lime":{"bg":"#0b0f0b","surface":"#131913","surface2":"#1a221a","border":"#273227","text":"#edf4ea","dim":"#9aa994","faint":"#5f6c5a","accent":"#a3e635","accentInk":"#15230a"},"rose":{"bg":"#0e0d0f","surface":"#171519","surface2":"#201d23","border":"#2e2a32","text":"#f1eef2","dim":"#a39ba8","faint":"#675f6c","accent":"#fb7185","accentInk":"#2c0810"},"cyan":{"bg":"#080d11","surface":"#0f161c","surface2":"#151f27","border":"#223039","text":"#e8f3f7","dim":"#8fa3ad","faint":"#56666f","accent":"#22d3ee","accentInk":"#032027"},"indigo":{"bg":"#0b0c10","surface":"#131520","surface2":"#1a1d2e","border":"#272b40","text":"#ebedf6","dim":"#969ab4","faint":"#5b5f78","accent":"#6d7bff","accentInk":"#0c0f33"},"gold":{"bg":"#0f0d09","surface":"#19150f","surface2":"#231d14","border":"#322a1d","text":"#f5f0e6","dim":"#aaa08c","faint":"#6f6552","accent":"#e8c468","accentInk":"#271d05"}};
    var c = cw[id] || cw.teal;
    var r = document.documentElement.style;
    r.setProperty('--bg',c.bg);r.setProperty('--surface',c.surface);r.setProperty('--surface2',c.surface2);r.setProperty('--surface3',c.surface2);r.setProperty('--border',c.border);r.setProperty('--text',c.text);r.setProperty('--dim',c.dim);r.setProperty('--faint',c.faint);r.setProperty('--accent',c.accent);r.setProperty('--accent-ink',c.accentInk);r.setProperty('--accent-soft',c.accent+'22');r.setProperty('--accent-line',c.accent+'44');r.setProperty('--text-secondary',c.dim);r.setProperty('--text-muted',c.faint);r.setProperty('--text-dim',c.faint);r.setProperty('--surface-1',c.surface);r.setProperty('--surface-2',c.surface2);r.setProperty('--bg-elevated',c.surface);
  } catch(e){}
})()
`
  return (
    <html lang="en" className={`${arimo.variable} ${spaceGrotesk.variable} ${ibmPlexSans.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
