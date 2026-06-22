import { Game, STATUS_LABELS, STATUS_COLORS, formatPlaytime, steamHeaderUrl } from '../types'

interface RandomPickerModalProps {
  game: Game
  onPickAgain: () => void
  onView: () => void
  onClose: () => void
}

export default function RandomPickerModal({ game, onPickAgain, onView, onClose }: RandomPickerModalProps) {
  const color = STATUS_COLORS[game.status]

  function handleOverlay(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlay}>
      <div className="random-modal">
        <img
          className="random-modal-img"
          src={steamHeaderUrl(game.steamAppId)}
          alt={game.name}
          onError={(e) => { e.currentTarget.style.display = 'none' }}
        />
        <div className="random-modal-body">
          <div className="random-modal-name">{game.name}</div>
          <div className="random-modal-meta">
            <span className="status-badge" style={{ background: color + '22', color, marginRight: 8 }}>
              {STATUS_LABELS[game.status]}
            </span>
            {formatPlaytime(game.playtimeForever)} played
            {game.hltb?.main ? ` · ~${game.hltb.main}h to beat` : ''}
          </div>
          <div className="random-modal-actions">
            <button className="btn btn-primary" onClick={onView}>View Game</button>
            <button className="btn" onClick={onPickAgain}>Pick Again</button>
            <button className="btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
