import type { Workflow } from './types';

export function sortNewest<T extends { createdAt?: string }>(items: T[]) {
  return [...items].sort((left, right) => (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));
}

export function sortByWorkPriority<T extends { createdAt?: string; statusId: string }>(items: T[], workflow: Workflow) {
  return [...items].sort((left, right) => priority(workflow, left.statusId) - priority(workflow, right.statusId) || (right.createdAt ?? '').localeCompare(left.createdAt ?? ''));
}

function priority(workflow: Workflow, statusId: string) {
  const fixed = workflow.statuses.find((status) => status.id === statusId)?.fixed;
  return fixed === 'backlog' ? 1 : fixed === 'closed' ? 2 : 0;
}
