// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Board } from './Board';
import type { Task, Workflow } from './types';
import { renderWithMantine } from './testUtils';

const workflow: Workflow = {
  schemaVersion: 1, revision: 1, updatedAt: new Date().toISOString(), startStatusId: 'todo',
  statuses: [
    { id: 'backlog', name: 'Backlog', color: '#000000', completed: false, fixed: 'backlog' },
    { id: 'todo', name: 'Todo', color: '#111111', completed: false },
    { id: 'closed', name: 'Closed', color: '#222222', completed: true, fixed: 'closed' },
  ],
};
const task: Task = { id: 'task', planId: 'plan', revision: 1, title: 'Build board', description: 'Description', plan: '', statusId: 'todo', effort: 8, archivedAt: null, subtasks: [] };
const backlogTask: Task = { ...task, id: 'backlog-task', title: 'Hidden backlog work', statusId: 'backlog' };
afterEach(cleanup);

describe('Board', () => {
  it('renders workflow columns, task effort, and subtask count', () => {
    render(<Board planId="plan" workflow={workflow} tasks={[task, backlogTask]} onSelect={vi.fn()} onChanged={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByText('Build board')).toBeTruthy();
    expect(screen.getByText('8 pts')).toBeTruthy();
    expect(screen.getByText('0 subtasks')).toBeTruthy();
    expect(screen.getByText('Closed')).toBeTruthy();
    expect(screen.queryByText('Backlog')).toBeNull();
    expect(screen.queryByText('Hidden backlog work')).toBeNull();
  });

  it('opens quick task creation form', () => {
    renderWithMantine(<Board planId="plan" workflow={workflow} tasks={[task]} onSelect={vi.fn()} onChanged={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByText('+ Task'));
    expect(screen.getByPlaceholderText('Task title')).toBeTruthy();
    expect(Array.from(screen.getByRole('combobox', { name: 'Task effort points' }).querySelectorAll('option')).map((option) => option.value)).toEqual(['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '100']);
  });
});
