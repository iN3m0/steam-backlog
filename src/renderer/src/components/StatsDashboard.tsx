import { useMemo, useState } from 'react'
import { Game, STATUS_LABELS, STATUS_COLORS, GameStatus, formatPlaytime } from '../types'

interface StatsDashboardProps {
  games: Game[]
}

const PLAYTIME_BUCKETS = [
  { label: 'Never played', min: 0,    max: 0        },
  { label: '< 1 hr',       min: 1,    max: 59       },
  { label: '1 – 5 hrs',    min: 60,   max: 299      },
  { label: '5 – 20 hrs',   min: 300,  max: 1199     },
  { label: '20 – 50 hrs',  min: 1200, max: 2999     },
  { label: '50 – 100 hrs', min: 3000, max: 5999     },
  { label: '100+ hrs',     min: 6000, max: Infinity  },
]

function formatClearTime(hours: number): string {
  const days = Math.round(hours / 2)
  if (days >= 730) return `~${(days / 365).toFixed(1)} years`
  if (days >= 30)  return `~${Math.round(days / 30)} months`
  return `~${days} days`
}

interface Expanded { label: string; games: Game[] }

export default function StatsDashboard({ games }: StatsDashboardProps) {
  const [cardExpand,   setCardExpand]   = useState<Expanded | null>(null)
  const [bucketExpand, setBucketExpand] = useState<Expanded | null>(null)
  const [showAllBacklog, setShowAllBacklog] = useState(false)
  const [showAllHltb,    setShowAllHltb]    = useState(false)
  const [backlogMode,       setBacklogMode]       = useState<'main' | 'completionist'>('main')
  const [includeOngoing,    setIncludeOngoing]    = useState(false)

  function toggleCard(label: string, list: Game[]) {
    setCardExpand(prev => prev?.label === label ? null : {
      label,
      games: [...list].sort((a, b) => b.playtimeForever - a.playtimeForever || a.name.localeCompare(b.name))
    })
  }

  function toggleBucket(label: string, list: Game[]) {
    setBucketExpand(prev => prev?.label === label ? null : {
      label,
      games: [...list].sort((a, b) => b.playtimeForever - a.playtimeForever || a.name.localeCompare(b.name))
    })
  }

  const stats = useMemo(() => {
    // backlogMode captured from closure so it's a dependency
    const total = games.length
    const byStatus: Record<GameStatus, number> = {
      unplayed: 0, in_progress: 0, ongoing: 0, completed: 0, mastered: 0, abandoned: 0
    }
    let totalMinutes = 0, finishedMinutes = 0, neverLaunched = 0
    let hltbCount = 0, achEarned = 0, achTotal = 0

    for (const g of games) {
      byStatus[g.status]++
      totalMinutes += g.playtimeForever
      if (g.status === 'completed' || g.status === 'mastered') finishedMinutes += g.playtimeForever
      if (g.playtimeForever === 0) neverLaunched++
      if (g.hltb) hltbCount++
      if (g.achievements) { achEarned += g.achievements.earned; achTotal += g.achievements.total }
    }

    const finished = byStatus.completed + byStatus.mastered
    const completionPct = total > 0 ? Math.round((finished / total) * 100) : 0
    const avgCompleted  = finished > 0 ? Math.round(finishedMinutes / finished) : 0

    const top10 = [...games]
      .sort((a, b) => b.playtimeForever - a.playtimeForever)
      .slice(0, 10)
      .filter(g => g.playtimeForever > 0)

    // Playtime distribution (buckets include game lists for expansion)
    const playtimeBuckets = PLAYTIME_BUCKETS.map(({ label, min, max }) => {
      const list = games.filter(g =>
        min === 0 && max === 0 ? g.playtimeForever === 0
        : max === Infinity       ? g.playtimeForever >= min
        : g.playtimeForever >= min && g.playtimeForever <= max
      )
      return { label, count: list.length, list }
    })

    // HLTB vs actual (mastered → completionist; completed → main)
    const hltbVsActual = games
      .filter(g =>
        (g.status === 'completed' || g.status === 'mastered') &&
        g.hltb && g.hltb.main > 0 && g.playtimeForever > 0
      )
      .map(g => {
        const hltbHours = g.status === 'mastered' && g.hltb!.completionist > 0
          ? g.hltb!.completionist : g.hltb!.main
        const estimated = hltbHours * 60
        return { name: g.name, steamAppId: g.steamAppId, actual: g.playtimeForever, estimated, diff: g.playtimeForever - estimated }
      })
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

    // Backlog heat (respects backlogMode and includeOngoing)
    const hltbField = backlogMode === 'main' ? 'main' : 'completionist'
    const backlogGames = games.filter(g =>
      g.status === 'unplayed' || g.status === 'in_progress' ||
      (includeOngoing && g.status === 'ongoing')
    )
    const backlogWithHltb = backlogGames.filter(g => g.hltb && g.hltb[hltbField] > 0)
    const backlogHours    = backlogWithHltb.reduce((sum, g) => sum + g.hltb![hltbField], 0)
    const backlogHeaviest = [...backlogWithHltb].sort((a, b) => b.hltb![hltbField] - a.hltb![hltbField])

    return {
      total, byStatus, totalMinutes, completionPct, avgCompleted, neverLaunched,
      hltbCount, achEarned, achTotal, top10, finished,
      playtimeBuckets, hltbVsActual, backlogGames, backlogWithHltb, backlogHours, backlogHeaviest,
      hltbField
    }
  }, [games, backlogMode, includeOngoing])

  if (stats.total === 0) {
    return (
      <div className="stats-view" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-title">No data yet</div>
          <div className="empty-state-desc">Sync your Steam library to see stats.</div>
        </div>
      </div>
    )
  }

  const statusSegments: Array<{ status: GameStatus; color: string }> = [
    { status: 'mastered',    color: STATUS_COLORS.mastered    },
    { status: 'completed',   color: STATUS_COLORS.completed   },
    { status: 'ongoing',     color: STATUS_COLORS.ongoing     },
    { status: 'in_progress', color: STATUS_COLORS.in_progress },
    { status: 'abandoned',   color: STATUS_COLORS.abandoned   },
    { status: 'unplayed',    color: '#3d5a70'                 },
  ]

  const maxBucket  = Math.max(...stats.playtimeBuckets.map(b => b.count), 1)
  const hltbMaxVal = Math.max(...stats.hltbVsActual.map(c => Math.max(c.actual, c.estimated)), 1)

  const displayedHltb    = showAllHltb    ? stats.hltbVsActual    : stats.hltbVsActual.slice(0, 10)
  const displayedBacklog = showAllBacklog ? stats.backlogHeaviest  : stats.backlogHeaviest.slice(0, 8)

  return (
    <div className="stats-view">

      {/* ── Overview cards ─────────────────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard value={stats.total}                 label="Total Games" />
        <StatCard value={stats.byStatus.unplayed}     label="Unplayed"
          sub={`${Math.round(stats.byStatus.unplayed / stats.total * 100)}% of library`}
          active={cardExpand?.label === 'Unplayed'}
          onClick={() => toggleCard('Unplayed', games.filter(g => g.status === 'unplayed'))} />
        <StatCard value={stats.byStatus.in_progress}  label="In Progress"
          active={cardExpand?.label === 'In Progress'}
          onClick={() => toggleCard('In Progress', games.filter(g => g.status === 'in_progress'))} />
        <StatCard value={stats.finished}              label="Finished"
          sub={`${stats.completionPct}% of library`}
          active={cardExpand?.label === 'Finished'}
          onClick={() => toggleCard('Finished', games.filter(g => g.status === 'completed' || g.status === 'mastered'))} />
        <StatCard value={stats.byStatus.mastered}     label="Mastered"
          sub="100% / all achievements"
          active={cardExpand?.label === 'Mastered'}
          onClick={() => toggleCard('Mastered', games.filter(g => g.status === 'mastered'))} />
        <StatCard value={stats.byStatus.ongoing}      label="Ongoing"
          sub="No completion state"
          active={cardExpand?.label === 'Ongoing'}
          onClick={() => toggleCard('Ongoing', games.filter(g => g.status === 'ongoing'))} />
        <StatCard value={stats.byStatus.abandoned}    label="Abandoned"
          active={cardExpand?.label === 'Abandoned'}
          onClick={() => toggleCard('Abandoned', games.filter(g => g.status === 'abandoned'))} />
        <StatCard value={formatPlaytime(stats.totalMinutes)} label="Total Playtime" />
        <StatCard value={formatPlaytime(stats.avgCompleted)} label="Avg per Finished" />
        <StatCard value={stats.neverLaunched}         label="Never Launched"
          sub={`${Math.round(stats.neverLaunched / stats.total * 100)}% of library`}
          active={cardExpand?.label === 'Never Launched'}
          onClick={() => toggleCard('Never Launched', games.filter(g => g.playtimeForever === 0))} />
      </div>

      {/* Card expansion panel */}
      {cardExpand && (
        <ExpandedList
          label={cardExpand.label}
          games={cardExpand.games}
          onClose={() => setCardExpand(null)}
        />
      )}

      {/* ── Library breakdown ───────────────────────────────────────────── */}
      <div className="stats-section">
        <div className="stats-section-title">Library Breakdown</div>
        <div className="completion-bar-track">
          {statusSegments.map(({ status, color }) =>
            stats.byStatus[status] > 0 ? (
              <div key={status} className="completion-bar-seg"
                style={{ flex: stats.byStatus[status], background: color }}
                title={`${STATUS_LABELS[status]}: ${stats.byStatus[status]}`}
              />
            ) : null
          )}
        </div>
        <div className="completion-legend">
          {statusSegments.map(({ status, color }) => (
            <div key={status} className="completion-legend-item">
              <div className="completion-legend-dot" style={{ background: color }} />
              {STATUS_LABELS[status]}: {stats.byStatus[status]}
            </div>
          ))}
        </div>
      </div>

      {/* ── Playtime distribution ───────────────────────────────────────── */}
      <div className="stats-section">
        <div className="stats-section-title">Playtime Distribution</div>
        <div className="stats-section-sub">Click a row to see the games in that range</div>
        <div className="bar-chart">
          {stats.playtimeBuckets.map(({ label, count, list }) => (
            <div
              key={label}
              className={`bar-row ${count > 0 ? 'bar-row-clickable' : ''} ${bucketExpand?.label === label ? 'bar-row-active' : ''}`}
              onClick={() => count > 0 && toggleBucket(label, list)}
            >
              <div className="bar-name">{label}</div>
              <div className="bar-track">
                {count > 0 && (
                  <div className="bar-fill" style={{
                    width: `${(count / maxBucket) * 100}%`,
                    background: label === 'Never played' ? 'var(--text-muted)' : 'var(--accent)'
                  }} />
                )}
              </div>
              <div className="bar-value">{count}</div>
            </div>
          ))}
        </div>
        {bucketExpand && (
          <ExpandedList
            label={bucketExpand.label}
            games={bucketExpand.games}
            onClose={() => setBucketExpand(null)}
            style={{ marginTop: 12 }}
          />
        )}
      </div>

      {/* ── Backlog heat ────────────────────────────────────────────────── */}
      {stats.backlogHours > 0 && (
        <div className="stats-section">
          <div className="stats-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            Backlog Heat
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label className="backlog-ongoing-toggle">
                <input
                  type="checkbox"
                  checked={includeOngoing}
                  onChange={e => setIncludeOngoing(e.target.checked)}
                />
                Include Ongoing
              </label>
              <div className="mode-toggle">
                <button className={backlogMode === 'main' ? 'active' : ''} onClick={() => setBacklogMode('main')}>Main Story</button>
                <button className={backlogMode === 'completionist' ? 'active' : ''} onClick={() => setBacklogMode('completionist')}>100%</button>
              </div>
            </div>
          </div>
          <div className="backlog-heat-card">
            <div>
              <div className="backlog-heat-hours">{stats.backlogHours.toLocaleString()}h</div>
              <div className="backlog-heat-label">estimated to clear</div>
            </div>
            <div className="backlog-heat-details">
              <div>At 2h/day — {formatClearTime(stats.backlogHours)}</div>
              <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>
                Based on {stats.backlogWithHltb.length} of {stats.backlogGames.length} unplayed / in-progress games with HLTB data
              </div>
            </div>
          </div>
          {stats.backlogHeaviest.length > 0 && (
            <>
              <div className="stats-section-sub" style={{ marginBottom: 8 }}>Heaviest in backlog</div>
              <div className="bar-chart">
                {displayedBacklog.map(g => (
                  <div key={g.steamAppId} className="bar-row">
                    <div className="bar-name" title={g.name}>{g.name}</div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(g.hltb![stats.hltbField] / stats.backlogHeaviest[0].hltb![stats.hltbField]) * 100}%` }} />
                    </div>
                    <div className="bar-value">{g.hltb![stats.hltbField]}h</div>
                  </div>
                ))}
              </div>
              {stats.backlogHeaviest.length > 8 && (
                <button className="stats-show-more" onClick={() => setShowAllBacklog(v => !v)}>
                  {showAllBacklog ? `Show fewer` : `Show all ${stats.backlogHeaviest.length} games`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── HLTB vs actual ──────────────────────────────────────────────── */}
      {stats.hltbVsActual.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">HLTB vs Actual Playtime</div>
          <div className="stats-section-sub" style={{ marginBottom: 10 }}>
            Finished games with HLTB data · ghost = estimate · solid = actual · green = under · orange = over
          </div>
          <div className="bar-chart">
            {displayedHltb.map(({ name, steamAppId, actual, estimated, diff }) => (
              <div key={steamAppId} className="bar-row">
                <div className="bar-name" title={name}>{name}</div>
                <div className="hltb-compare-track">
                  <div className="hltb-compare-ghost" style={{ width: `${(estimated / hltbMaxVal) * 100}%` }} />
                  <div className="hltb-compare-actual" style={{
                    width: `${(actual / hltbMaxVal) * 100}%`,
                    background: diff > 0 ? '#e67e22' : '#4bb543'
                  }} />
                </div>
                <div className="bar-value">
                  {formatPlaytime(actual)}
                  <span className={`hltb-diff ${diff > 0 ? 'over' : 'under'}`}>
                    {diff > 0 ? '+' : '-'}{formatPlaytime(Math.abs(diff))}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {stats.hltbVsActual.length > 10 && (
            <button className="stats-show-more" onClick={() => setShowAllHltb(v => !v)}>
              {showAllHltb ? 'Show fewer' : `Show all ${stats.hltbVsActual.length} games`}
            </button>
          )}
          <div className="stats-section-sub" style={{ marginTop: 8 }}>
            Mastered compared against HLTB completionist; completed against main story
          </div>
        </div>
      )}

      {/* ── Top 10 most played ──────────────────────────────────────────── */}
      {stats.top10.length > 0 && (
        <div className="stats-section">
          <div className="stats-section-title">Top {stats.top10.length} Most Played</div>
          <div className="bar-chart">
            {stats.top10.map(g => (
              <div key={g.steamAppId} className="bar-row">
                <div className="bar-name" title={g.name}>{g.name}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(g.playtimeForever / stats.top10[0].playtimeForever) * 100}%` }} />
                </div>
                <div className="bar-value">{formatPlaytime(g.playtimeForever)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Achievement & HLTB coverage ─────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 0 }}>
        {stats.achTotal > 0 && (
          <StatCard
            value={`${stats.achEarned} / ${stats.achTotal}`}
            label="Achievements"
            sub={`${Math.round(stats.achEarned / stats.achTotal * 100)}% earned`}
          />
        )}
        <StatCard value={stats.hltbCount} label="HLTB Fetched" sub={`${stats.total - stats.hltbCount} remaining`} />
      </div>

    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface StatCardProps {
  value: string | number
  label: string
  sub?: string
  onClick?: () => void
  active?: boolean
}

function StatCard({ value, label, sub, onClick, active }: StatCardProps) {
  return (
    <div
      className={`stat-card ${onClick ? 'stat-card-clickable' : ''} ${active ? 'stat-card-active' : ''}`}
      onClick={onClick}
      title={onClick ? (active ? 'Click to collapse' : 'Click to expand') : undefined}
    >
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
      {onClick && <div className="stat-card-expand-icon">{active ? '▲' : '▼'}</div>}
    </div>
  )
}

function ExpandedList({ label, games, onClose, style }: { label: string; games: Game[]; onClose: () => void; style?: React.CSSProperties }) {
  return (
    <div className="stats-expanded" style={style}>
      <div className="stats-expanded-header">
        <span className="stats-expanded-title">
          {label} <span className="stats-expanded-count">({games.length})</span>
        </span>
        <button className="stats-expanded-close" onClick={onClose}>×</button>
      </div>
      <div className="stats-expanded-list">
        {games.length === 0
          ? <div className="stats-expanded-empty">No games</div>
          : games.map(g => (
            <div key={g.steamAppId} className="stats-expanded-row">
              <span className="stats-expanded-name" title={g.name}>{g.name}</span>
              <span className="status-badge" style={{ background: STATUS_COLORS[g.status] + '22', color: STATUS_COLORS[g.status], flexShrink: 0 }}>
                {STATUS_LABELS[g.status]}
              </span>
              {g.hltb && <span className="stats-expanded-hltb">{g.hltb.main}h</span>}
              <span className="stats-expanded-time">{formatPlaytime(g.playtimeForever)}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}
