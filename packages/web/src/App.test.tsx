// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { api } from './api';
import { renderWithMantine } from './testUtils';
import type { Plan, Project, Workflow } from './types';

const workflow: Workflow = {
  schemaVersion: 1,
  revision: 1,
  updatedAt: new Date().toISOString(),
  startStatusId: 'todo',
  statuses: [
    { id: 'backlog', name: 'Backlog', color: '#64748b', completed: false, fixed: 'backlog' },
    { id: 'todo', name: 'Todo', color: '#3b82f6', completed: false },
    { id: 'closed', name: 'Closed', color: '#334155', completed: true, fixed: 'closed' },
  ],
};
const plan: Plan = {
  id: 'plan',
  revision: 1,
  title: 'Platform',
  summary: '',
  sourcePlan: '',
  statusId: 'todo',
  archivedAt: null,
  progress: { completedEffort: 0, totalEffort: 0, percentage: 0 },
};
const project: Project = {
  id: 'project',
  revision: 1,
  name: 'Taskdroid test',
  workflow,
  documents: {},
  plans: [plan],
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App navigation and selected-plan state', () => {
  it('keeps accessible view selection and plan filtering in sync', async () => {
    vi.stubGlobal('EventSource', class {
      close = vi.fn();
      addEventListener = vi.fn();
    });
    vi.spyOn(api, 'project').mockResolvedValue(project);
    vi.spyOn(api, 'plans').mockResolvedValue([plan]);
    vi.spyOn(api, 'tasks').mockResolvedValue([]);

    renderWithMantine(<App />);

    const boardTab = await screen.findByRole('button', { name: 'Board', exact: true });
    const listTab = screen.getByRole('button', { name: 'List', exact: true });
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy();
    expect(boardTab.getAttribute('aria-pressed')).toBe('true');
    expect(listTab.getAttribute('aria-pressed')).toBe('false');

    fireEvent.change(screen.getByRole('combobox', { name: 'Plan filter' }), {
      target: { value: plan.id },
    });
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Plan filter' })).toHaveProperty('value', plan.id));

    fireEvent.click(listTab);
    expect(listTab.getAttribute('aria-pressed')).toBe('true');
    expect(boardTab.getAttribute('aria-pressed')).toBe('false');
    expect(await screen.findByRole('heading', { name: 'Platform' })).toBeTruthy();
  });
});
