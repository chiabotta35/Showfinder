'use client'
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'

const STORAGE_KEY = 'showfinder_settings'

export interface TrackedShow {
  id: string
  artistName: string
  date: string
  venueName?: string
  venueCity?: string
  ticketUrl?: string
}

export interface AppSettings {
  // Theme (accent + colorway)
  theme: string
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
  // Tracked events (individual shows, not artists)
  trackedEvents: TrackedShow[]
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'default',
  showsCardLayout: 'standard',
  showsFilters: { sort: true, source: true, city: true, hubs: true },
  dashboardSections: { quickStats: true, nextShow: true, artistCount: true },
  artistView: 'list',
  navdockTabs: ['dashboard', 'artists', 'shows', 'discover', 'account'],
  navdockOrder: ['dashboard', 'artists', 'shows', 'discover', 'account'],
  trackedEvents: [],
}

export const COLORWAYS = [
  { id: 'default', name: 'Midnight', accent: '#3b82f6', bg: '#0a0a0f', surface: '#111118', surface2: '#1a1a24', surface3: '#222230', border: '#2a2a3a', text: '#f0f0f5', textSecondary: '#8888aa', textMuted: '#555570' },
  { id: 'light', name: 'Daylight', accent: '#3b82f6', bg: '#f8f8fc', surface: '#ffffff', surface2: '#f0f0f5', surface3: '#e5e5ee', border: '#d5d5e0', text: '#1a1a2e', textSecondary: '#555570', textMuted: '#8888aa' },
  { id: 'ocean', name: 'Ocean', accent: '#06b6d4', bg: '#0a1628', surface: '#0f1f35', surface2: '#152a42', surface3: '#1c3550', border: '#244560', text: '#e0f0ff', textSecondary: '#7ab8d8', textMuted: '#4a8aaa' },
  { id: 'forest', name: 'Forest', accent: '#22c55e', bg: '#0a120a', surface: '#0f1f10', surface2: '#152a16', surface3: '#1c351d', border: '#244528', text: '#e0ffe0', textSecondary: '#7acc7a', textMuted: '#4a9a4a' },
  { id: 'sunset', name: 'Sunset', accent: '#f97316', bg: '#120a08', surface: '#1f1210', surface2: '#2a1814', surface3: '#35201a', border: '#453025', text: '#fff0e0', textSecondary: '#d8a070', textMuted: '#aa7050' },
  { id: 'lavender', name: 'Lavender', accent: '#a855f7', bg: '#100a14', surface: '#1a1020', surface2: '#22182c', surface3: '#2c2038', border: '#3a2c48', text: '#f0e0ff', textSecondary: '#b888d8', textMuted: '#8a5aaa' },
  { id: 'rose', name: 'Rose', accent: '#ec4899', bg: '#120a10', surface: '#1f101a', surface2: '#2a1424', surface3: '#351c2e', border: '#45283a', text: '#ffe0f0', textSecondary: '#d870a8', textMuted: '#aa5080' },
  { id: 'ember', name: 'Ember', accent: '#ef4444', bg: '#100808', surface: '#1c0e0e', surface2: '#261414', surface3: '#301c1c', border: '#402828', text: '#ffe0e0', textSecondary: '#d87070', textMuted: '#aa5050' },
]

function getThemeColors(id: string): Record<string, string> {
  const cw = COLORWAYS.find(c => c.id === id) ?? COLORWAYS[0]
  return {
    '--accent': cw.accent,
    '--accent-dim': cw.accent + 'cc',
    '--accent-soft': cw.accent + '1a',
    '--accent-glow': cw.accent + '40',
    '--bg': cw.bg,
    '--surface-1': cw.surface,
    '--surface-2': cw.surface2,
    '--surface-3': cw.surface3,
    '--border': cw.border,
    '--text': cw.text,
    '--text-secondary': cw.textSecondary,
    '--text-muted': cw.textMuted,
    '--text-dim': cw.textMuted,
    '--text-faint': cw.textMuted + '80',
  }
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Migrate legacy accentColor-only → new theme system
      if ('accentColor' in parsed && !parsed.theme) {
        const match = COLORWAYS.find(c => c.accent === parsed.accentColor)
        parsed.theme = match ? match.id : 'default'
        delete parsed.accentColor
      }
      // Migrate trackedArtists → trackedEvents (drop old artist data)
      if ('trackedArtists' in parsed) delete parsed.trackedArtists
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
  toggleTrackedEvent: (show: { id: string; artistName: string; date: string; venueName?: string; venueCity?: string; ticketUrl?: string }) => void
}

const SettingsContext = createContext<SettingsCtx>({
  settings: DEFAULT_SETTINGS,
  update: () => {},
  toggleTrackedEvent: () => {},
})

export function useSettings() { return useContext(SettingsContext) }

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setSettings(loadSettings())
    setMounted(true)
  }, [])

  // Apply theme colors to CSS variables
  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    const vars = getThemeColors(settings.theme)
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v)
    }
    saveSettings(settings)
  }, [settings, mounted])

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleTrackedEvent = useCallback((show: { id: string; artistName: string; date: string; venueName?: string; venueCity?: string; ticketUrl?: string }) => {
    setSettings(prev => {
      const idx = prev.trackedEvents.findIndex(e => e.id === show.id)
      const tracked = idx >= 0
        ? prev.trackedEvents.filter((_, i) => i !== idx)
        : [...prev.trackedEvents, show]
      return { ...prev, trackedEvents: tracked }
    })
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, update, toggleTrackedEvent }}>
      {children}
    </SettingsContext.Provider>
  )
}
