import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api

interface Props { onClose: () => void }

export default function AboutModal({ onClose }: Props) {
  const [version, setVersion] = useState('...')

  useEffect(() => {
    api.app.getVersion().then(setVersion)
  }, [])

  function openExternal(url: string) {
    api.app.openExternal(url)
  }

  function handleOverlay(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎮</div>
        <div className="modal-title" style={{ marginBottom: 4 }}>Steam Backlog Tracker</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>Version {version}</div>

        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
          Track your Steam library, set priorities, record completion status,
          fetch HLTB estimates, and visualise your backlog with stats.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          <button className="btn" onClick={() => openExternal('https://github.com/GITHUB_USERNAME/steam-backlog/issues')}>
            Report an Issue ↗
          </button>
          <button className="btn" onClick={() => openExternal('https://steamcommunity.com/dev/apikey')}>
            Steam API Key Page ↗
          </button>
        </div>

        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 16 }}>
          Not affiliated with Valve or Steam.
          Game data from Steam Web API and HowLongToBeat.
        </div>

        <div className="modal-actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
