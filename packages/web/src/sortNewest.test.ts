import { describe, expect, it } from 'vitest';
import { sortByWorkPriority, sortNewest } from './sortNewest';
import type { Workflow } from './types';

const workflow: Workflow = { schemaVersion: 1, revision: 1, updatedAt: '2026-01-01T00:00:00.000Z', startStatusId: 'todo', statuses: [
  { id: 'backlog', name: 'Backlog', color: '#64748b', completed: false, fixed: 'backlog' },
  { id: 'todo', name: 'Todo', color: '#3b82f6', completed: false },
  { id: 'closed', name: 'Closed', color: '#334155', completed: true, fixed: 'closed' },
] };

describe('sortNewest', () => {
  it('orders records newest first without mutating the source array', () => {
    const items = [
      { id: 'old', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'new', createdAt: '2026-02-01T00:00:00.000Z' },
      { id: 'middle', createdAt: '2026-01-15T00:00:00.000Z' },
    ];
    expect(sortNewest(items).map((item) => item.id)).toEqual(['new', 'middle', 'old']);
    expect(items.map((item) => item.id)).toEqual(['old', 'new', 'middle']);
  });

  it('places active work first, backlog next, and closed work last', () => {
    const items = [
      { id: 'old-active', statusId: 'todo', createdAt: '2026-01-01T00:00:00.000Z' },
      { id: 'new-backlog', statusId: 'backlog', createdAt: '2026-03-01T00:00:00.000Z' },
      { id: 'closed', statusId: 'closed', createdAt: '2026-04-01T00:00:00.000Z' },
      { id: 'new-active', statusId: 'todo', createdAt: '2026-02-01T00:00:00.000Z' },
      { id: 'old-backlog', statusId: 'backlog', createdAt: '2025-12-01T00:00:00.000Z' },
    ];
    expect(sortByWorkPriority(items, workflow).map((item) => item.id)).toEqual(['new-active', 'old-active', 'new-backlog', 'old-backlog', 'closed']);
  });
});
