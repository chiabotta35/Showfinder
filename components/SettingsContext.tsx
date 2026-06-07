'use client'
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

const STORAGE_KEY = 'showfinder_settings'

export interface AppSettings {
  // Accent color
  accentColor: string
  // Shows page
  showsCardLayout: 'compact' | 'standard' | 'large'
  showsFilters: { sort: boolean; source: boolean; city: boolean; hubs: boolean }
  // Dashboard
  dashboardSections: { quickStats: boolean; nextShow: boolean; artistCount: boolean }
  // Artists
  artistView: 'list' | 'grid'
  // NavDock
  navdockTabs: string[]
  navdockOrder: string[]
  // Tracked artists
  trackedArtists: string[]
}

const DEFAULT_SETTINGS: AppSettings = {
  accentColor: '#3b82f6',
  showsCardLayout: 'standard',
  showsFilters: { sort: true, source: true, city: true, hubs: true },
  dashboardSections: { quickStats: true, nextShow: true, artistCount: true },
  artistView: 'list',
  navdockTabs: ['dashboard', 'artists', 'shows', 'discover', 'account'],
  navdockOrder: ['dashboard', 'artists', 'shows', 'discover', 'account'],
  trackedArtists: [],
}

export const ACCENT_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
]

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {}
  return DEFAULT_SETTINGS
}

function saveSettings(s: AppSettings) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

interface SettingsCtx {
  settings: AppSettings
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  toggleTrackedArtist: (name: string) => void
}

const SettingsContext = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  toggleTrackedArtist: () => {},
})

export function useSettings() { return useContext(SettingsContext) }

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setMounted(true)
  }, [])

  // Apply accent color to CSS variables
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    root.style.setProperty('--accent', settings.accentColor)
    // Derive dim and soft variants
    root.style.setProperty('--accent-dim', settings.accentColor + 'cc')
    root.style.setProperty('--accent-soft', settings.accentColor + '1a')
    root.style.setProperty('--accent-glow', settings.accentColor + '40')
    saveSettings(settings)
  }, [settings, mounted])

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleTrackedArtist = useCallback((name: string) => {
    setSettings(prev => {
      const tracked = prev.trackedArtists.includes(name)
        ? prev.trackedArtists.filter(n => n !== name)
        : [...prev.trackedArtists, name]
      return { ...prev, trackedArtists: tracked }
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, update, toggleTrackedArtist }}>
      {children}
    </SettingsContext.Provider>
  )
}
