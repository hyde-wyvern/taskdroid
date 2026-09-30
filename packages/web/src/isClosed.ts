import type { Workflow } from './types';

export function isClosed(workflow: Workflow, statusId: string) {
  return workflow.statuses.some((status) => status.id === statusId && status.fixed === 'closed');
}
