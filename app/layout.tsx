import type { Metadata } from 'next'
import './globals.css'
import ClientProviders from '@/components/ClientProviders'

export const metadata: Metadata = {
  title: 'ShowFinder — Find concerts from your music',
  description: 'Discover upcoming shows from the artists you actually listen to.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  )
}
