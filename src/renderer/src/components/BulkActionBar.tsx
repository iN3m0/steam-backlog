import { FilterStatus, GameStatus, STATUS_LABELS } from '../types'

interface BulkActionBarProps {
  count: number
  onStatusChange: (status: FilterStatus) => void
  onDelete: () => void
  onCancel: () => void
}

export default function BulkActionBar({ count, onStatusChange, onDelete, onCancel }: BulkActionBarProps) {
  return (
    <div className="bulk-bar">
      <span className="bulk-bar-count">{count} selected</span>
      <select
        className="bulk-bar-select"
        defaultValue=""
        onChange={(e) => { if (e.target.value) onStatusChange(e.target.value as FilterStatus) }}
      >
        <option value="" disabled>Set status…</option>
        {(Object.entries(STATUS_LABELS) as [GameStatus, string][]).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>
      <button className="btn btn-danger btn-sm" onClick={onDelete}>Remove Selected</button>
      <button className="btn btn-sm" onClick={onCancel}>Cancel</button>
    </div>
  )
}
