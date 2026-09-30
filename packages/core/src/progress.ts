import type { Task, Workflow } from './models.js';

export type Progress = { completedEffort: number; totalEffort: number; percentage: number };

export function taskEffort(task: Task): number {
  const active = task.subtasks.filter((subtask) => !subtask.archivedAt);
  return active.length ? active.reduce((sum, subtask) => sum + subtask.effort, 0) : task.effort;
}

export function calculateProgress(tasks: Task[], workflow: Workflow): Progress {
  const completed = new Set(workflow.statuses.filter((status) => status.completed || status.fixed === 'closed').map((status) => status.id));
  let totalEffort = 0;
  let completedEffort = 0;
  for (const task of tasks.filter((item) => !item.archivedAt)) {
    const subtasks = task.subtasks.filter((item) => !item.archivedAt);
    const leaves = subtasks.length ? subtasks : [task];
    for (const leaf of leaves) {
      totalEffort += leaf.effort;
      if (completed.has(leaf.statusId)) completedEffort += leaf.effort;
    }
  }
  return { completedEffort, totalEffort, percentage: totalEffort ? Math.round((completedEffort / totalEffort) * 100) : 0 };
}
