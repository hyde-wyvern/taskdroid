export type WorkItemKind = 'plan' | 'task' | 'subtask';

const MARKERS: Record<WorkItemKind, string> = { plan: '♠️', task: '♥️', subtask: '♣️' };

export function IssueKey({ value, kind, compact = false }: { value?: string; kind: WorkItemKind; compact?: boolean }) {
  return value ? <span className={`issue-key${compact ? ' compact' : ''}`} aria-hidden="true">{value}<span className="issue-marker">{MARKERS[kind]}</span></span> : null;
}
