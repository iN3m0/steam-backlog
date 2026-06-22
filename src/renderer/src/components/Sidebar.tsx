import { FilterStatus, GameStatus, STATUS_LABELS, AppView } from '../types'

interface SidebarProps {
  filter: FilterStatus
  counts: Record<FilterStatus, number>
  onFilter: (f: FilterStatus) => void
  view: AppView
  onViewChange: (v: AppView) => void
}

const FILTERS: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all', label: 'All Games' },
  { value: 'unplayed', label: STATUS_LABELS.unplayed },
  { value: 'in_progress', label: STATUS_LABELS.in_progress },
  { value: 'ongoing', label: STATUS_LABELS.ongoing },
  { value: 'completed', label: STATUS_LABELS.completed },
  { value: 'mastered', label: STATUS_LABELS.mastered },
  { value: 'abandoned', label: STATUS_LABELS.abandoned }
]

export default function Sidebar({ filter, counts, onFilter, view, onViewChange }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-section-title">View</div>
      <button
        className={`filter-btn ${view === 'games' ? 'active' : ''}`}
        onClick={() => onViewChange('games')}
      >
        Library
      </button>
      <button
        className={`filter-btn ${view === 'stats' ? 'active' : ''}`}
        onClick={() => onViewChange('stats')}
      >
        Stats
      </button>

      <div className="sidebar-divider" />
      <div className="sidebar-section-title">Filter</div>
      {FILTERS.map(({ value, label }) => (
        <button
          key={value}
          className={`filter-btn ${filter === value && view === 'games' ? 'active' : ''}`}
          onClick={() => { onFilter(value); onViewChange('games') }}
        >
          {label}
          <span className="filter-count">{counts[value]}</span>
        </button>
      ))}

      <div className="sidebar-divider" />
      <div className="sidebar-section-title">Backlog</div>
      <CompletionBar counts={counts} />
    </div>
  )
}

function CompletionBar({ counts }: { counts: Record<FilterStatus, number> }) {
  const total = counts.all
  if (total === 0) return null

  const pct = (n: number) => Math.round((n / total) * 100)

  const segments: Array<{ status: GameStatus; color: string }> = [
    { status: 'mastered', color: '#c9a227' },
    { status: 'completed', color: '#4bb543' },
    { status: 'ongoing', color: '#9b59b6' },
    { status: 'in_progress', color: '#66c0f4' },
    { status: 'abandoned', color: '#c25f5f' },
    { status: 'unplayed', color: '#3d5a70' }
  ]

  const finishedPct = pct(counts.completed + counts.mastered)

  return (
    <div style={{ padding: '4px 16px 12px' }}>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1, marginBottom: 8 }}>
        {segments.map(({ status, color }) =>
          counts[status] > 0 ? (
            <div
              key={status}
              style={{ flex: counts[status], background: color }}
              title={`${STATUS_LABELS[status]}: ${pct(counts[status])}%`}
            />
          ) : null
        )}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <div>{finishedPct}% finished</div>
        {counts.mastered > 0 && <div>{pct(counts.mastered)}% mastered</div>}
        <div>{pct(counts.unplayed)}% unplayed</div>
      </div>
    </div>
  )
}
