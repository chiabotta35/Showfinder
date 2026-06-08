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
  return (
    <html lang="en" className={`${arimo.variable} ${spaceGrotesk.variable} ${ibmPlexSans.variable}`}>
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
