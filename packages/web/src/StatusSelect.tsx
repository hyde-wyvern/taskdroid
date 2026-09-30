import type { Status } from './types';

export function StatusSelect({ statuses, value, onChange, disabled = false, compact = false, id, label = 'Status' }: { statuses: Status[]; value: string; onChange: (statusId: string) => void; disabled?: boolean; compact?: boolean; id?: string; label?: string }) {
  const color = statuses.find((status) => status.id === value)?.color;
  return <select
    id={id}
    className={`select-arrow status-select${compact ? ' compact' : ''}`}
    aria-label={label}
    value={value}
    disabled={disabled}
    style={{ borderColor: color }}
    onChange={(event) => onChange(event.target.value)}
  >
    {statuses.map((status) => <option key={status.id} value={status.id}>{status.name}</option>)}
  </select>;
}
