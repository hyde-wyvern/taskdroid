import type { Workflow } from './models.js';
import { SCHEMA_VERSION } from './models.js';

export function defaultWorkflow(now = new Date().toISOString()): Workflow {
  return {
    schemaVersion: SCHEMA_VERSION,
    revision: 1,
    updatedAt: now,
    startStatusId: 'in-progress',
    statuses: [
      { id: 'backlog', name: 'Backlog', color: '#64748b', completed: false, fixed: 'backlog' },
      { id: 'todo', name: 'Todo', color: '#3b82f6', completed: false },
      { id: 'in-progress', name: 'In Progress', color: '#f59e0b', completed: false },
      { id: 'ready-review', name: 'Ready for Review', color: '#8b5cf6', completed: false },
      { id: 'done', name: 'Done', color: '#22c55e', completed: true },
      { id: 'closed', name: 'Closed', color: '#334155', completed: true, fixed: 'closed' },
    ],
  };
}
