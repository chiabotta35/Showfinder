'use client'
import { useState } from 'react'
import { useSettings, COLORWAYS } from './SettingsContext'

interface Props { onClose: () => void }

const NAV_OPTS = [
  { id: 'home', label: 'Home' },
  { id: 'artists', label: 'Artists' },
  { id: 'shows', label: 'Shows' },
  { id: 'tracked', label: 'Tracked' },
  { id: 'discover', label: 'Discover' },
  { id: 'account', label: 'Account' },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.2 5.8 10 11 4.2" />
    </svg>
  )
}

export default function SettingsPanel({ onClose }: Props) {
  const { settings, update } = useSettings()
  const [tab, setTab] = useState<'theme' | 'layout' | 'navdock'>('theme')

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="settings-panel" onMouseDown={e => e.stopPropagation()}>
        <div className="sp-head">
          <h2>Settings</h2>
          <button className="icon-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <div className="sp-tabs">
          {(['theme', 'layout', 'navdock'] as const).map(t => (
            <button key={t} className={`sp-tab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
              {t === 'theme' ? 'Theme' : t === 'layout' ? 'Layout' : 'NavDock'}
            </button>
          ))}
        </div>

        <div className="sp-body">
          {tab === 'theme' && (
            <>
              <div className="sp-section-label">Colorway &middot; {COLORWAYS.length} presets</div>
              <div className="swatch-grid">
                {COLORWAYS.map(cw => {
                  const active = settings.theme === cw.id
                  return (
                    <button key={cw.id} className={`swatch ${active ? 'active' : ''}`}
                      onClick={() => update('theme', cw.id)}
                      style={{ background: cw.bg, borderColor: active ? cw.accent : cw.border }}>
                      <div className="sw-preview" style={{ background: cw.surface, borderColor: cw.border }}>
                        <span style={{ background: cw.accent }} />
                        <span style={{ background: cw.text, opacity: 0.85 }} />
                        <span style={{ background: cw.dim, opacity: 0.6 }} />
                      </div>
                      <span className="sw-name" style={{ color: cw.text }}>{cw.name}</span>
                      {active && (
                        <span className="sw-check" style={{ background: cw.accent, color: cw.accentInk }}>
                          <CheckIcon />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {tab === 'layout' && (
            <>
              <div className="sp-section-label">Card size</div>
              <div className="seg">
                {(['compact', 'comfy', 'rich'] as const).map(v => (
                  <button key={v} className={`seg-btn ${settings.showsCardLayout === v ? 'on' : ''}`}
                    onClick={() => update('showsCardLayout', v)}
                    style={settings.showsCardLayout === v ? { color: 'var(--accent-ink)', background: 'var(--accent)' } : {}}>
                    {v === 'compact' ? 'Compact' : v === 'comfy' ? 'Comfortable' : 'Rich'}
                  </button>
                ))}
              </div>

              <div className="sp-section-label">Artist view</div>
              <div className="seg">
                {(['list', 'grid'] as const).map(v => (
                  <button key={v} className={`seg-btn ${settings.artistView === v ? 'on' : ''}`}
                    onClick={() => update('artistView', v)}
                    style={settings.artistView === v ? { color: 'var(--accent-ink)', background: 'var(--accent)' } : {}}>
                    {v === 'list' ? 'List' : 'Grid'}
                  </button>
                ))}
              </div>

              <div className="sp-section-label">Filters &amp; sections</div>
              <button className="toggle-line" onClick={() => update('showsFilters', { ...settings.showsFilters, sort: !settings.showsFilters.sort })}>
                <div className="tl-text"><span className="tl-label">Show filters</span><span className="tl-sub">Sort, source &amp; city on Shows</span></div>
                <span className={`switch ${settings.showsFilters.sort ? 'on' : ''}`}><i /></span>
              </button>
              <button className="toggle-line" onClick={() => update('showPresale', !settings.showPresale)}>
                <div className="tl-text"><span className="tl-label">Presale countdowns</span><span className="tl-sub">Live countdown banner on Shows</span></div>
                <span className={`switch ${settings.showPresale ? 'on' : ''}`}><i /></span>
              </button>

              <div className="sp-section-label">Dashboard sections</div>
              <button className="toggle-line" onClick={() => update('dashboardSections', { ...settings.dashboardSections, quickStats: !settings.dashboardSections.quickStats })}>
                <div className="tl-text"><span className="tl-label">Quick stats</span></div>
                <span className={`switch ${settings.dashboardSections.quickStats ? 'on' : ''}`}><i /></span>
              </button>
              <button className="toggle-line" onClick={() => update('dashboardSections', { ...settings.dashboardSections, quickActions: !settings.dashboardSections.quickActions })}>
                <div className="tl-text"><span className="tl-label">Quick actions</span></div>
                <span className={`switch ${settings.dashboardSections.quickActions ? 'on' : ''}`}><i /></span>
              </button>
              <button className="toggle-line" onClick={() => update('dashboardSections', { ...settings.dashboardSections, topArtists: !settings.dashboardSections.topArtists })}>
                <div className="tl-text"><span className="tl-label">Top artists</span></div>
                <span className={`switch ${settings.dashboardSections.topArtists ? 'on' : ''}`}><i /></span>
              </button>
            </>
          )}

          {tab === 'navdock' && (
            <>
              <div className="sp-section-label">Visible tabs &middot; {settings.navdockTabs.length}</div>
              <div className="navtab-list">
                {NAV_OPTS.map(o => {
                  const on = settings.navdockTabs.includes(o.id)
                  const minReached = on && settings.navdockTabs.length <= 3
                  return (
                    <button key={o.id} className="toggle-line" onClick={() => {
                      if (minReached) return
                      const next = on
                        ? settings.navdockTabs.filter(t => t !== o.id)
                        : [...settings.navdockTabs, o.id]
                      update('navdockTabs', next)
                    }}>
                      <div className="tl-text">
                        <span className="tl-label">{o.label}</span>
                        {minReached && <span className="tl-sub">Minimum 3 tabs</span>}
                      </div>
                      <span className={`switch ${on ? 'on' : ''}`}><i /></span>
                    </button>
                  )
                })}
              </div>
              <div className="sp-hint">Settings is always reachable via the gear icon.</div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
