import { describe, expect, it } from 'vitest';
import { defaultWorkflow } from './defaults.js';
import { calculateProgress, taskEffort } from './progress.js';
import type { Task } from './models.js';

const now = new Date().toISOString();
function task(overrides: Partial<Task> = {}): Task {
  return { id: 'task', planId: 'plan', schemaVersion: 1, revision: 1, createdAt: now, updatedAt: now, title: 'Task', description: '', plan: '', statusId: 'backlog', effort: 10, archivedAt: null, subtasks: [], ...overrides };
}

describe('weighted progress', () => {
  it('counts unsliced leaf effort by completed status', () => {
    expect(calculateProgress([task({ statusId: 'done', effort: 30 }), task({ id: 'two', effort: 70 })], defaultWorkflow())).toEqual({ completedEffort: 30, totalEffort: 100, percentage: 30 });
  });

  it('replaces parent effort with active subtask effort', () => {
    const parent = task({ effort: 99, subtasks: [
      { id: 'one', taskId: 'task', schemaVersion: 1, revision: 1, createdAt: now, updatedAt: now, title: 'One', description: '', plan: '', statusId: 'done', effort: 20, archivedAt: null },
      { id: 'two', taskId: 'task', schemaVersion: 1, revision: 1, createdAt: now, updatedAt: now, title: 'Two', description: '', plan: '', statusId: 'todo', effort: 30, archivedAt: null },
    ] });
    expect(taskEffort(parent)).toBe(50);
    expect(calculateProgress([parent], defaultWorkflow())).toEqual({ completedEffort: 20, totalEffort: 50, percentage: 40 });
  });

  it('reports zero for no weighted work', () => expect(calculateProgress([task({ effort: 0 })], defaultWorkflow()).percentage).toBe(0));
});
