import { useState, KeyboardEvent } from 'react'
import { Game, GameStatus, HltbData, AchievementData, STATUS_LABELS, formatPlaytime, formatLastPlayed, steamHeaderUrl, steamPageUrl } from '../types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = (window as any).api

interface GameDetailProps {
  game: Game
  onUpdate: (g: Game) => void
  onDelete: (g: Game) => void
}

export default function GameDetail({ game, onUpdate, onDelete }: GameDetailProps) {
  const [tagInput, setTagInput] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)
  const [fetchingHltb, setFetchingHltb] = useState(false)
  const [fetchingAch, setFetchingAch] = useState(false)
  const [hltbError, setHltbError] = useState('')
  const [achError, setAchError] = useState('')

  function update(patch: Partial<Game>) {
    onUpdate({ ...game, ...patch })
  }

  function addTag() {
    const tag = tagInput.trim()
    if (tag && !game.tags.includes(tag)) update({ tags: [...game.tags, tag] })
    setTagInput('')
  }

  function removeTag(tag: string) {
    update({ tags: game.tags.filter((t) => t !== tag) })
  }

  function onTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addTag() }
    if (e.key === 'Backspace' && tagInput === '' && game.tags.length > 0) {
      update({ tags: game.tags.slice(0, -1) })
    }
  }

  async function fetchHltb() {
    setFetchingHltb(true)
    setHltbError('')
    try {
      const data: HltbData = await api.hltb.search(game.name)
      update({ hltb: data })
    } catch (err: unknown) {
      setHltbError(err instanceof Error ? err.message : 'Failed to fetch HLTB data')
    } finally {
      setFetchingHltb(false)
    }
  }

  async function fetchAchievements() {
    setFetchingAch(true)
    setAchError('')
    try {
      const data: AchievementData = await api.steam.fetchAchievements(game.steamAppId)
      update({ achievements: data })
    } catch (err: unknown) {
      setAchError(err instanceof Error ? err.message : 'Failed to fetch achievements')
    } finally {
      setFetchingAch(false)
    }
  }

  const achPct = game.achievements
    ? Math.round((game.achievements.earned / game.achievements.total) * 100)
    : 0

  return (
    <div className="game-detail">
      {!imgFailed ? (
        <img
          className="game-detail-header-img"
          src={steamHeaderUrl(game.steamAppId)}
          alt={game.name}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="game-detail-header-fallback">No image</div>
      )}

      <div className="game-detail-body">
        <div className="game-detail-name">{game.name}</div>
        <div className="game-detail-playtime">
          {formatPlaytime(game.playtimeForever)} played · Last played: {formatLastPlayed(game.lastPlayedAt)}
        </div>

        {/* Status */}
        <div className="detail-field">
          <div className="detail-label">Status</div>
          <select
            className="detail-select"
            value={game.status}
            onChange={(e) => update({ status: e.target.value as GameStatus })}
          >
            {(Object.entries(STATUS_LABELS) as [GameStatus, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div className="detail-field">
          <div className="detail-label">Priority</div>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`star ${i <= game.priority ? 'filled' : ''}`}
                onClick={() => update({ priority: i === game.priority ? 0 : i })}
              >
                ★
              </span>
            ))}
          </div>
        </div>

        {/* HLTB */}
        <div className="detail-field">
          <div className="detail-label">How Long to Beat</div>
          {game.hltb ? (
            <div className="hltb-grid">
              <HltbCell label="Main" hours={game.hltb.main} />
              <HltbCell label="Main+Extra" hours={game.hltb.extra} />
              <HltbCell label="Complete" hours={game.hltb.completionist} />
            </div>
          ) : (
            <div style={{ marginBottom: 6, fontSize: 12, color: 'var(--text-muted)' }}>No data</div>
          )}
          {hltbError && <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>{hltbError}</div>}
          <button className="btn btn-sm" onClick={fetchHltb} disabled={fetchingHltb}>
            {fetchingHltb ? 'Fetching…' : game.hltb ? 'Refresh HLTB' : 'Fetch HLTB'}
          </button>
        </div>

        {/* Achievements */}
        <div className="detail-field">
          <div className="detail-label">Achievements</div>
          {game.achievements ? (
            <>
              <div className="achievement-label">
                {game.achievements.earned} / {game.achievements.total} ({achPct}%)
              </div>
              <div className="achievement-bar-track">
                <div className="achievement-bar-fill" style={{ width: `${achPct}%` }} />
              </div>
            </>
          ) : (
            <div style={{ marginBottom: 6, fontSize: 12, color: 'var(--text-muted)' }}>No data</div>
          )}
          {achError && <div style={{ fontSize: 11, color: 'var(--danger)', marginBottom: 6 }}>{achError}</div>}
          <button className="btn btn-sm" onClick={fetchAchievements} disabled={fetchingAch}>
            {fetchingAch ? 'Fetching…' : game.achievements ? 'Refresh' : 'Fetch Achievements'}
          </button>
        </div>

        {/* Notes */}
        <div className="detail-field">
          <div className="detail-label">Notes</div>
          <textarea
            className="detail-textarea"
            value={game.notes}
            placeholder="Add notes…"
            onChange={(e) => update({ notes: e.target.value })}
          />
        </div>

        {/* Tags */}
        <div className="detail-field">
          <div className="detail-label">Tags</div>
          <div className="tags-container">
            {game.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
                <button className="tag-remove" onClick={() => removeTag(tag)}>×</button>
              </span>
            ))}
          </div>
          <input
            className="tag-input"
            placeholder="Add tag…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={onTagKeyDown}
            onBlur={addTag}
          />
        </div>

        {/* Actions */}
        <div className="game-detail-actions">
          <button className="btn" onClick={() => window.open(steamPageUrl(game.steamAppId), '_blank')}>
            Steam Page ↗
          </button>
          {!showDeleteConfirm ? (
            <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Remove</button>
          ) : (
            <>
              <button className="btn btn-danger" onClick={() => onDelete(game)}>Confirm Remove</button>
              <button className="btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function HltbCell({ label, hours }: { label: string; hours: number }) {
  return (
    <div className="hltb-cell">
      <div className="hltb-cell-value">{hours > 0 ? `${hours}h` : '—'}</div>
      <div className="hltb-cell-label">{label}</div>
    </div>
  )
}
