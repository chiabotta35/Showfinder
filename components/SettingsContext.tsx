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
  theme: string
  showsCardLayout: 'compact' | 'comfy' | 'rich'
  showsFilters: { sort: boolean; source: boolean; city: boolean; hubs: boolean }
  showPresale: boolean
  dashboardSections: { quickStats: boolean; quickActions: boolean; topArtists: boolean }
  artistView: 'list' | 'grid'
  navdockTabs: string[]
  trackedEvents: TrackedShow[]
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'teal',
  showsCardLayout: 'comfy',
  showsFilters: { sort: true, source: true, city: true, hubs: true },
  showPresale: true,
  dashboardSections: { quickStats: true, quickActions: true, topArtists: true },
  artistView: 'list',
  navdockTabs: ['home', 'artists', 'shows', 'tracked', 'discover', 'account'],
  trackedEvents: [],
}

export const COLORWAYS = [
  { id: 'teal', name: 'Charcoal Teal', bg: '#0d1011', surface: '#15191b', surface2: '#1d2326', border: '#2a3236', text: '#eef2f3', dim: '#9aa6ab', faint: '#5e6a6f', accent: '#2dd4bf', accentInk: '#04201c' },
  { id: 'amber', name: 'Espresso Amber', bg: '#100d0a', surface: '#1a1611', surface2: '#241e17', border: '#332a20', text: '#f4efe8', dim: '#ab9f90', faint: '#6f6354', accent: '#f5a623', accentInk: '#241600' },
  { id: 'violet', name: 'Midnight Violet', bg: '#0c0c14', surface: '#15151f', surface2: '#1d1d2c', border: '#2a2a3d', text: '#edecf5', dim: '#9b9ab0', faint: '#5f5f78', accent: '#8b7cff', accentInk: '#120a2e' },
  { id: 'neon', name: 'OLED Neon', bg: '#000000', surface: '#0c0e0c', surface2: '#141814', border: '#1f261f', text: '#eafaef', dim: '#8fa395', faint: '#566059', accent: '#46f08a', accentInk: '#022012' },
  { id: 'coral', name: 'Warm Coral', bg: '#120e0d', surface: '#1c1614', surface2: '#261d1a', border: '#352824', text: '#f6efec', dim: '#b09b94', faint: '#736159', accent: '#ff6f5e', accentInk: '#2c0c07' },
  { id: 'sky', name: 'Slate Sky', bg: '#0b0e12', surface: '#13171d', surface2: '#1a2029', border: '#283038', text: '#eaf0f6', dim: '#94a1b0', faint: '#5a6573', accent: '#4aa8ff', accentInk: '#04182e' },
  { id: 'magenta', name: 'Plum Magenta', bg: '#110b10', surface: '#1a131a', surface2: '#241a24', border: '#342634', text: '#f4ecf3', dim: '#ad95ab', faint: '#71596f', accent: '#ff5db1', accentInk: '#2e0820' },
  { id: 'lime', name: 'Forest Lime', bg: '#0b0f0b', surface: '#131913', surface2: '#1a221a', border: '#273227', text: '#edf4ea', dim: '#9aa994', faint: '#5f6c5a', accent: '#a3e635', accentInk: '#15230a' },
  { id: 'rose', name: 'Graphite Rose', bg: '#0e0d0f', surface: '#171519', surface2: '#201d23', border: '#2e2a32', text: '#f1eef2', dim: '#a39ba8', faint: '#675f6c', accent: '#fb7185', accentInk: '#2c0810' },
  { id: 'cyan', name: 'Navy Cyan', bg: '#080d11', surface: '#0f161c', surface2: '#151f27', border: '#223039', text: '#e8f3f7', dim: '#8fa3ad', faint: '#56666f', accent: '#22d3ee', accentInk: '#032027' },
  { id: 'indigo', name: 'Carbon Indigo', bg: '#0b0c10', surface: '#131520', surface2: '#1a1d2e', border: '#272b40', text: '#ebedf6', dim: '#969ab4', faint: '#5b5f78', accent: '#6d7bff', accentInk: '#0c0f33' },
  { id: 'gold', name: 'Mocha Gold', bg: '#0f0d09', surface: '#19150f', surface2: '#231d14', border: '#322a1d', text: '#f5f0e6', dim: '#aaa08c', faint: '#6f6552', accent: '#e8c468', accentInk: '#271d05' },
]

function getThemeVars(id: string): Record<string, string> {
  const cw = COLORWAYS.find(c => c.id === id) ?? COLORWAYS[0]
  return {
    '--bg': cw.bg,
    '--surface': cw.surface,
    '--surface2': cw.surface2,
    '--surface3': cw.surface2,
    '--border': cw.border,
    '--text': cw.text,
    '--dim': cw.dim,
    '--faint': cw.faint,
    '--accent': cw.accent,
    '--accent-ink': cw.accentInk,
    '--accent-soft': cw.accent + '22',
    '--accent-line': cw.accent + '44',
    '--text-secondary': cw.dim,
    '--text-muted': cw.faint,
    '--text-dim': cw.faint,
    '--text-faint': cw.faint + '60',
    '--surface-1': cw.surface,
    '--surface-2': cw.surface2,
    '--surface-3': cw.surface2,
    '--bg-elevated': cw.surface,
    '--border-hover': cw.border,
    '--border-strong': cw.border,
    '--shows-primary': '#ff9a3c',
    '--artists-primary': '#4aa8ff',
    '--discover-primary': '#a78bfa',
    '--home-primary': '#2dd4bf',
    '--account-primary': '#9aa6ab',
    '--sec-home': '#2dd4bf',
    '--sec-artists': '#4aa8ff',
    '--sec-shows': '#ff9a3c',
    '--sec-tracked': '#facc15',
    '--sec-discover': '#a78bfa',
    '--sec-account': '#9aa6ab',
  }
}

function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if ('accentColor' in parsed && !parsed.theme) {
        parsed.theme = 'teal'
        delete parsed.accentColor
      }
      if ('trackedArtists' in parsed) delete parsed.trackedArtists
      if ('navdockOrder' in parsed) delete parsed.navdockOrder
      // Migrate old card layout values
      if (parsed.showsCardLayout === 'standard') parsed.showsCardLayout = 'comfy'
      if (parsed.showsCardLayout === 'large') parsed.showsCardLayout = 'rich'
      if (parsed.dashboardSections?.nextShow !== undefined) {
        parsed.dashboardSections = {
          quickStats: parsed.dashboardSections.quickStats ?? true,
          quickActions: parsed.dashboardSections.quickActions ?? true,
          topArtists: parsed.dashboardSections.topArtists ?? true,
        }
      }
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
  toggleTrackedEvent: (show: TrackedShow) => void
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

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    const vars = getThemeVars(settings.theme)
    for (const [k, v] of Object.entries(vars)) {
      root.style.setProperty(k, v)
    }
    saveSettings(settings)
  }, [settings, mounted])

  const update = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  const toggleTrackedEvent = useCallback((show: TrackedShow) => {
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
