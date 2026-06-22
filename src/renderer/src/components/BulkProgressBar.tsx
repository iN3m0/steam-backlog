export interface BulkProgress {
  type: 'hltb' | 'achievements'
  done: number
  total: number
  errors: number
}

interface BulkProgressBarProps {
  progress: BulkProgress
  onCancel: () => void
}

export default function BulkProgressBar({ progress, onCancel }: BulkProgressBarProps) {
  const { type, done, total, errors } = progress
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const label = type === 'hltb' ? 'HLTB data' : 'Achievements'

  return (
    <div className="bulk-progress-bar">
      <span className="bulk-progress-label">
        Fetching {label}: {done} / {total}
        {errors > 0 && <span className="bulk-progress-errors"> · {errors} skipped</span>}
      </span>
      <div className="bulk-progress-track">
        <div className="bulk-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="bulk-progress-pct">{pct}%</span>
      <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  )
}
