import { useState, useEffect, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Game, steamCoverUrl, formatPlaytime, formatLastPlayed, STATUS_LABELS, STATUS_COLORS } from '../types'

const CARD_MIN = 220
const GAP = 12

interface GameGridProps {
  games: Game[]
  selected: Game | null
  onSelect: (g: Game) => void
  hasAnyGames: boolean
  onOpenSettings: () => void
  isSelecting: boolean
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
}

export default function GameGrid({
  games, selected, onSelect, hasAnyGames, onOpenSettings,
  isSelecting, selectedIds, onToggleSelect
}: GameGridProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [colCount, setColCount] = useState(4)

  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      setColCount(Math.max(1, Math.floor((w + GAP) / (CARD_MIN + GAP))))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const rows = useMemo(() => {
    const result: Game[][] = []
    for (let i = 0; i < games.length; i += colCount) result.push(games.slice(i, i + colCount))
    return result
  }, [games, colCount])

  // Approximate row height from card width (Steam capsule: 460×215 px)
  const rowEstimate = useMemo(() => {
    const w = (parentRef.current?.clientWidth ?? 800) - 32
    const cardW = (w - (colCount - 1) * GAP) / colCount
    const coverH = Math.round(cardW * (215 / 460))
    return coverH + 96 + GAP // 96 = card body height
  }, [colCount])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowEstimate,
    overscan: 4,
    measureElement: typeof window !== 'undefined' ? el => el?.getBoundingClientRect().height : undefined,
  })

  if (!hasAnyGames) {
    return (
      <div className="game-grid-container" style={{ display: 'flex' }}>
        <div className="empty-state">
          <div className="empty-state-icon">🎮</div>
          <div className="empty-state-title">No games yet</div>
          <div className="empty-state-desc">
            Add your Steam API key and Steam ID in{' '}
            <button
              onClick={onOpenSettings}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', padding: 0 }}
            >
              Settings
            </button>
            , then click <strong>Sync Library</strong> to import your games.
          </div>
        </div>
      </div>
    )
  }

  if (games.length === 0) {
    return (
      <div className="game-grid-container" style={{ display: 'flex' }}>
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No games match</div>
          <div className="empty-state-desc">Try adjusting your search or filter.</div>
        </div>
      </div>
    )
  }

  return (
    <div ref={parentRef} className="game-grid-container">
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vRow => (
          <div
            key={vRow.key}
            data-index={vRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${vRow.start}px)`,
              display: 'grid',
              gridTemplateColumns: `repeat(${colCount}, 1fr)`,
              gap: GAP,
              paddingBottom: GAP,
              boxSizing: 'border-box',
            }}
          >
            {rows[vRow.index].map(game => (
              <GameCard
                key={game.steamAppId}
                game={game}
                isSelected={!isSelecting && selected?.steamAppId === game.steamAppId}
                isChecked={selectedIds.has(game.steamAppId)}
                isSelecting={isSelecting}
                onClick={() => isSelecting ? onToggleSelect(game.steamAppId) : onSelect(game)}
                onCheck={(e) => { e.stopPropagation(); onToggleSelect(game.steamAppId) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

interface GameCardProps {
  game: Game
  isSelected: boolean
  isChecked: boolean
  isSelecting: boolean
  onClick: () => void
  onCheck: (e: React.MouseEvent<HTMLInputElement>) => void
}

function GameCard({ game, isSelected, isChecked, isSelecting, onClick, onCheck }: GameCardProps) {
  const color = STATUS_COLORS[game.status]

  return (
    <div
      className={`game-card ${isSelected ? 'selected' : ''} ${isChecked ? 'selected' : ''}`}
      onClick={onClick}
    >
      {isSelecting && (
        <input
          type="checkbox"
          className="game-card-checkbox"
          checked={isChecked}
          onClick={onCheck}
          onChange={() => {}}
        />
      )}
      <CoverImage appId={game.steamAppId} name={game.name} />
      <div className="game-card-body">
        <div className="game-card-name" title={game.name}>{game.name}</div>
        <div className="game-card-meta">
          <span className="status-badge" style={{ background: color + '22', color }}>
            {STATUS_LABELS[game.status]}
          </span>
          <span className="playtime-label">{formatPlaytime(game.playtimeForever)}</span>
          <div className="priority-dots">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`priority-dot ${i <= game.priority ? 'filled' : ''}`} />
            ))}
          </div>
        </div>
        {game.hltb?.main
          ? <div
              className="hltb-card-time"
              title={`Main: ${game.hltb.main}h${game.hltb.completionist > 0 ? ` · 100%: ${game.hltb.completionist}h` : ''}`}
            >
              ~{game.hltb.main}h
              {game.hltb.completionist > 0 && <span className="hltb-card-100"> · ~{game.hltb.completionist}h</span>}
            </div>
          : <div className="last-played-label">{formatLastPlayed(game.lastPlayedAt)}</div>
        }
      </div>
    </div>
  )
}

function CoverImage({ appId, name }: { appId: number; name: string }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="game-card-cover-fallback">
        <span className="game-card-cover-fallback-name">{name}</span>
      </div>
    )
  }

  return (
    <img
      className="game-card-cover"
      src={steamCoverUrl(appId)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
