'use client'
import { SettingsProvider } from './SettingsContext'
import AuthToast from './AuthToast'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <SettingsProvider>
      {children}
      <AuthToast />
    </SettingsProvider>
  )
}
