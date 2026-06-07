'use client'
import { useState } from 'react'
import { useSettings, ACCENT_COLORS } from './SettingsContext'

interface Props { onClose: () => void }

const ALL_NAV_TABS = [
  { id: 'dashboard', label: 'Home' },
  { id: 'artists', label: 'Artists' },
  { id: 'shows', label: 'Shows' },
  { id: 'discover', label: 'Discover' },
  { id: 'account', label: 'Account' },
]

export default function SettingsPanel({ onClose }: Props) {
  const { settings, update } = useSettings()
  const [section, setSection] = useState<'color' | 'layout' | 'navdock'>('color')

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      {/* Panel */}
      <div className="panel" style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: '80vh', overflow: 'auto', padding: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: 4 }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0' }}>
          {([['color', 'Color'], ['layout', 'Layout'], ['navdock', 'NavDock']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`chip ${section === key ? 'active' : ''}`}
              style={{ fontSize: 11, padding: '5px 12px' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 24px 24px' }}>
          {section === 'color' && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Accent color</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {ACCENT_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => update('accentColor', c.value)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                      padding: '12px 8px', borderRadius: 'var(--r-md)', border: '2px solid',
                      borderColor: settings.accentColor === c.value ? c.value : 'var(--border)',
                      background: settings.accentColor === c.value ? c.value + '15' : 'var(--surface-1)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', background: c.value,
                      boxShadow: settings.accentColor === c.value ? `0 0 12px ${c.value}60` : 'none',
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: settings.accentColor === c.value ? c.value : 'var(--text-secondary)' }}>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {section === 'layout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Shows card layout */}
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Shows card layout</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['compact', 'Compact'], ['standard', 'Standard'], ['large', 'Large']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => update('showsCardLayout', val)}
                      className={`chip ${settings.showsCardLayout === val ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shows filters */}
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Visible filters (Shows)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries({ sort: 'Sort', source: 'Source', city: 'City', hubs: 'Tour hubs' }).map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={settings.showsFilters[key as keyof typeof settings.showsFilters]}
                        onChange={(e) => update('showsFilters', { ...settings.showsFilters, [key]: e.target.checked })}
                        style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Dashboard sections */}
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Dashboard sections</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries({ quickStats: 'Quick stats', nextShow: 'Next show', artistCount: 'Artist count' }).map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={settings.dashboardSections[key as keyof typeof settings.dashboardSections]}
                        onChange={(e) => update('dashboardSections', { ...settings.dashboardSections, [key]: e.target.checked })}
                        style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Artist view */}
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Artist view</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['list', 'List'], ['grid', 'Grid']] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => update('artistView', val)}
                      className={`chip ${settings.artistView === val ? 'active' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {section === 'navdock' && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Visible tabs</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {ALL_NAV_TABS.map(tab => {
                  const visible = settings.navdockTabs.includes(tab.id)
                  return (
                    <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={visible}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...settings.navdockTabs, tab.id]
                            : settings.navdockTabs.filter(id => id !== tab.id)
                          update('navdockTabs', next)
                        }}
                        style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                      />
                      {tab.label}
                    </label>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
