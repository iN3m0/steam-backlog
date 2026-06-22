import { useState, useRef, useEffect } from 'react'

interface HeaderProps {
  isSyncing: boolean
  onSync: () => void
  onSettings: () => void
  onFetchAllHltb: () => void
  onFetchAllAchievements: () => void
  hltbMissing: number
  achievementsMissing: number
  isBulkFetching: boolean
  onHelp: () => void
  onAbout: () => void
  onExport: () => void
}

export default function Header({
  isSyncing, onSync, onSettings,
  onFetchAllHltb, onFetchAllAchievements,
  hltbMissing, achievementsMissing,
  isBulkFetching,
  onHelp, onAbout, onExport
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function trigger(fn: () => void) {
    setMenuOpen(false)
    fn()
  }

  return (
    <div className="header">
      <span className="header-title">Steam Backlog Tracker</span>
      <div className="header-actions">
        <button className="btn" onClick={onSync} disabled={isSyncing || isBulkFetching}>
          {isSyncing ? '⟳ Syncing…' : '⟳ Sync Library'}
        </button>

        {/* Fetch All dropdown */}
        <div style={{ position: 'relative' }} ref={menuRef}>
          <button
            className="btn"
            onClick={() => setMenuOpen(o => !o)}
            disabled={isBulkFetching}
            title="Bulk fetch HLTB or achievement data"
          >
            ⚡ Fetch All ▾
          </button>
          {menuOpen && (
            <div className="dropdown-menu">
              <button
                className="dropdown-item"
                onClick={() => trigger(onFetchAllHltb)}
                disabled={hltbMissing === 0}
              >
                HLTB data
                <span className="dropdown-badge">{hltbMissing} missing</span>
              </button>
              <button
                className="dropdown-item"
                onClick={() => trigger(onFetchAllAchievements)}
                disabled={achievementsMissing === 0}
              >
                Achievements
                <span className="dropdown-badge">{achievementsMissing} missing</span>
              </button>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => trigger(onExport)}>
                Export Data…
              </button>
            </div>
          )}
        </div>

        <button className="btn btn-icon" onClick={onHelp} title="Help &amp; Guide">?</button>
        <button className="btn btn-icon" onClick={onSettings} title="Settings" disabled={isBulkFetching}>⚙</button>
        <button className="btn btn-icon" onClick={onAbout} title="About">ℹ</button>
      </div>
    </div>
  )
}
