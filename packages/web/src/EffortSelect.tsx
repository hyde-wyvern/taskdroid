export const EFFORT_OPTIONS = [0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 100] as const;

export function EffortSelect({ value, onChange, label = 'Effort points' }: { value: number; onChange: (effort: number) => void; label?: string }) {
  return <select className="select-arrow effort-select" aria-label={label} value={value} onChange={(event) => onChange(Number(event.target.value))}>
    {EFFORT_OPTIONS.map((effort) => <option key={effort} value={effort}>{effort} points</option>)}
  </select>;
}
