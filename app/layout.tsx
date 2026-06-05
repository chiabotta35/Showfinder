import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShowFinder — Find concerts from your music',
  description: 'Discover upcoming shows from the artists you actually listen to.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
