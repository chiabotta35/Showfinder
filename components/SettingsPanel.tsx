'use client'
import { useState } from 'react'
import { useSettings, COLORWAYS } from './SettingsContext'

interface Props { onClose: () => void }

const ALL_NAV_TABS = [
  { id: 'dashboard', label: 'Home' },
  { id: 'artists', label: 'Artists' },
  { id: 'shows', label: 'Shows' },
  { id: 'tracked', label: 'Tracked' },
  { id: 'discover', label: 'Discover' },
  { id: 'account', label: 'Account' },
]

export default function SettingsPanel({ onClose }: Props) {
  const { settings, update } = useSettings()
  const [section, setSection] = useState<'theme' | 'layout' | 'navdock'>('theme')

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div className="panel" style={{ position: 'relative', width: '100%', maxWidth: 440, maxHeight: '80vh', overflow: 'auto', padding: 0 }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)' }}>Settings</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20, padding: 4 }}>&times;</button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '12px 24px 0' }}>
          {([['theme', 'Theme'], ['layout', 'Layout'], ['navdock', 'NavDock']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSection(key)} className={`chip ${section === key ? 'active' : ''}`} style={{ fontSize: 11, padding: '5px 12px' }}>{label}</button>
          ))}
        </div>

        <div style={{ padding: '16px 24px 24px' }}>
          {section === 'theme' && (
            <div>
              <div className="section-label" style={{ marginBottom: 10 }}>Color theme</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                {COLORWAYS.map(cw => {
                  const active = settings.theme === cw.id
                  return (
                    <button
                      key={cw.id}
                      onClick={() => update('theme', cw.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 12px', borderRadius: 'var(--r-md)',
                        border: `2px solid ${active ? cw.accent : 'var(--border)'}`,
                        background: active ? cw.accent + '15' : cw.bg,
                        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: cw.accent, boxShadow: active ? `0 0 12px ${cw.accent}60` : 'none', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: cw.text, fontFamily: 'Syne, sans-serif' }}>{cw.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: cw.bg, border: `1px solid ${cw.border}` }} />
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: cw.surface, border: `1px solid ${cw.border}` }} />
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: cw.surface2, border: `1px solid ${cw.border}` }} />
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: cw.accent }} />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {section === 'layout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Shows card layout</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['compact', 'Compact'], ['standard', 'Standard'], ['large', 'Large']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => update('showsCardLayout', val)} className={`chip ${settings.showsCardLayout === val ? 'active' : ''}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Visible filters (Shows)</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries({ sort: 'Sort', source: 'Source', city: 'City', hubs: 'Tour hubs' }).map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={settings.showsFilters[key as keyof typeof settings.showsFilters]} onChange={(e) => update('showsFilters', { ...settings.showsFilters, [key]: e.target.checked })} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Dashboard sections</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries({ quickStats: 'Quick stats', nextShow: 'Next show', artistCount: 'Artist count' }).map(([key, label]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <input type="checkbox" checked={settings.dashboardSections[key as keyof typeof settings.dashboardSections]} onChange={(e) => update('dashboardSections', { ...settings.dashboardSections, [key]: e.target.checked })} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="section-label" style={{ marginBottom: 8 }}>Artist view</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {([['list', 'List'], ['grid', 'Grid']] as const).map(([val, label]) => (
                    <button key={val} onClick={() => update('artistView', val)} className={`chip ${settings.artistView === val ? 'active' : ''}`}>{label}</button>
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
                      <input type="checkbox" checked={visible} onChange={(e) => {
                        const next = e.target.checked ? [...settings.navdockTabs, tab.id] : settings.navdockTabs.filter(id => id !== tab.id)
                        update('navdockTabs', next)
                      }} style={{ accentColor: 'var(--accent)', width: 16, height: 16 }} />
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
