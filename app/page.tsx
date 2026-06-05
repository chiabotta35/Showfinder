import { getSession } from '@/lib/session'
import { getUserById } from '@/lib/db'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/LandingPage'
export default async function Page() {
  const session = await getSession()
  if (session.userId) { const user = getUserById(session.userId); if (user) redirect('/dashboard') }
  else if (session.lastfm?.username) redirect('/dashboard')
  return <LandingPage />
}
