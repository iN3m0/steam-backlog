import { useState, useEffect } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api

interface SettingsModalProps {
  onClose: () => void
  onSaved: () => void
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href="#" onClick={(e) => { e.preventDefault(); window.open(href, '_blank') }}>
      {children}
    </a>
  )
}

export default function SettingsModal({ onClose, onSaved }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [steamId, setSteamId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.settings.get().then((s: { steamApiKey: string; steamId: string }) => {
      setApiKey(s.steamApiKey)
      setSteamId(s.steamId)
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    await api.settings.set({ steamApiKey: apiKey.trim(), steamId: steamId.trim() })
    setSaving(false)
    onSaved()
    onClose()
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-title">Settings</div>

        <div className="form-field">
          <label className="form-label">Steam API Key</label>
          <input
            className="form-input"
            type="password"
            placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            spellCheck={false}
          />
          <div className="form-hint">
            Get your key at{' '}
            <ExternalLink href="https://steamcommunity.com/dev/apikey">
              steamcommunity.com/dev/apikey
            </ExternalLink>
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Steam ID (64-bit)</label>
          <input
            className="form-input"
            type="text"
            placeholder="76561198XXXXXXXXX"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            spellCheck={false}
          />
          <div className="form-hint">
            Find yours at{' '}
            <ExternalLink href="https://www.steamidfinder.com/">steamidfinder.com</ExternalLink>
            . Your game list must be set to <strong>Public</strong>.
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
