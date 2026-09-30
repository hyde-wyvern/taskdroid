// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { PlanEditor } from './PlanEditor';
import { TaskEditor } from './TaskEditor';
import type { Plan, Task, Workflow } from './types';
import { renderWithMantine } from './testUtils';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const now = new Date().toISOString();
const workflow: Workflow = { schemaVersion: 1, revision: 1, updatedAt: now, startStatusId: 'todo', statuses: [
  { id: 'backlog', name: 'Backlog', color: '#64748b', completed: false, fixed: 'backlog' },
  { id: 'todo', name: 'Todo', color: '#3b82f6', completed: false },
  { id: 'closed', name: 'Closed', color: '#334155', completed: true, fixed: 'closed' },
] };
const plan: Plan = { id: 'plan', revision: 1, title: 'Viewer plan', summary: 'Summary', sourcePlan: '# Plan', statusId: 'todo', archivedAt: null, progress: { completedEffort: 3, totalEffort: 8, percentage: 38 } };
const task: Task = { id: 'task', key: 'EP-2', planId: 'plan', revision: 1, title: 'Viewer task', description: 'Description', plan: 'Plan', statusId: 'todo', effort: 8, archivedAt: null, subtasks: [
  { id: 'one', taskId: 'task', revision: 1, title: 'Done work', description: 'Subtask description', plan: 'Subtask plan', statusId: 'closed', effort: 3, archivedAt: null },
  { id: 'two', taskId: 'task', revision: 1, title: 'Remaining work', description: '', plan: '', statusId: 'todo', effort: 5, archivedAt: null },
] };

describe('detail dialogs', () => {
  it('opens plan read-only and enables fields only after Edit', async () => {
    const onSelectTask = vi.fn();
    vi.spyOn(api, 'tasks').mockResolvedValue([{ ...task, id: 'archived-task', title: 'Archived task', archivedAt: now }]);
    renderWithMantine(<PlanEditor plan={plan} tasks={[task]} workflow={workflow} archived={false} onSelectTask={onSelectTask} onClose={vi.fn()} onSaved={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Viewer plan' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Viewer plan' }).closest('.dialog')?.classList.contains('wide')).toBe(true);
    expect(screen.queryByText('Plan details')).toBeNull();
    expect(screen.getByText('38% complete')).toBeTruthy();
    expect(screen.getByText('3/8 points')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Plan status' })).toHaveProperty('value', 'todo');
    expect(screen.getByRole('progressbar', { name: 'Plan progress' }).getAttribute('aria-valuenow')).toBe('38');
    expect(screen.getByText('Tasks')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Viewer task' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Viewer task status' })).toHaveProperty('value', 'todo');
    fireEvent.click(screen.getByRole('button', { name: 'Viewer task' }));
    expect(onSelectTask).toHaveBeenCalledWith(task);
    expect(screen.queryByDisplayValue('Viewer plan')).toBeNull();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('Viewer plan')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Edit plan' })).toBeTruthy();
    expect(screen.getByDisplayValue('Viewer task')).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'Viewer task status' })).toHaveProperty('value', 'todo');
    expect(screen.getByRole('button', { name: 'Archive Viewer task' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ New task' }));
    expect(screen.getByPlaceholderText('New task')).toBeTruthy();
    expect(Array.from(screen.getByRole('combobox', { name: 'New task effort points' }).querySelectorAll('option')).map((option) => option.value)).toEqual(['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '100']);
    await waitFor(() => expect(screen.getByText('Archived task')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Restore' })).toBeTruthy();
  });

  it('opens task read-only and enables fields only after Edit', () => {
    renderWithMantine(<TaskEditor task={task} planKey="EP-1" workflow={workflow} archived={false} onSelectPlan={vi.fn()} onClose={vi.fn()} onSaved={vi.fn()} onError={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Viewer task' })).toBeTruthy();
    expect(screen.queryByText('Task details')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Task status' })).toHaveProperty('value', 'todo');
    expect(screen.getByRole('combobox', { name: 'Done work status' })).toHaveProperty('value', 'closed');
    expect(screen.getByRole('combobox', { name: 'Remaining work status' })).toHaveProperty('value', 'todo');
    expect(screen.getByText('38% complete')).toBeTruthy();
    expect(screen.getByText('3/8 effort points')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'Task progress' }).getAttribute('aria-valuenow')).toBe('38');
    expect(screen.queryByDisplayValue('Viewer task')).toBeNull();
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByDisplayValue('Viewer task')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Edit task' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '+ New subtask' }));
    expect(Array.from(screen.getByRole('combobox', { name: 'New subtask effort points' }).querySelectorAll('option')).map((option) => option.value)).toEqual(['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '100']);
  });

  it('opens subtask viewer and editor from task details', () => {
    const onSelectPlan = vi.fn();
    renderWithMantine(<TaskEditor task={{ ...task, key: 'EP-2', subtasks: task.subtasks.map((item, index) => ({ ...item, key: `EP-${index + 3}` })) }} planKey="EP-1" workflow={workflow} archived={false} onSelectPlan={onSelectPlan} onClose={vi.fn()} onSaved={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Done work' }));
    expect(screen.getByRole('heading', { name: 'Done work' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Viewer task' })).toBeNull();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Open EP-1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open EP-2' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Done work' }).closest('.dialog')?.classList.contains('wide')).toBe(true);
    expect(screen.getByText('Subtask description')).toBeTruthy();
    expect(screen.getByText('Subtask plan')).toBeTruthy();
    expect(screen.getByText('3/3 effort points')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Edit subtask' }));
    expect(screen.getByRole('heading', { name: 'Edit subtask' })).toBeTruthy();
    expect(screen.getByDisplayValue('Subtask description')).toBeTruthy();
    expect(screen.getByDisplayValue('Subtask plan')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open EP-2' }));
    expect(screen.getByRole('heading', { name: 'Viewer task' })).toBeTruthy();
  });

  it('keeps task edit changes local until Save, then returns to the viewer', async () => {
    const updateTask = vi.spyOn(api, 'updateTask').mockResolvedValue({ ...task, statusId: 'closed', revision: 2 });
    renderWithMantine(<TaskEditor task={task} planKey="EP-1" workflow={workflow} archived={false} onSelectPlan={vi.fn()} onClose={vi.fn()} onSaved={vi.fn()} onError={vi.fn()} />);
    fireEvent.click(screen.getByText('Edit'));
    fireEvent.change(screen.getByRole('combobox', { name: 'Task status' }), { target: { value: 'closed' } });
    expect(updateTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(updateTask).toHaveBeenCalledWith(task, expect.objectContaining({ statusId: 'closed' })));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Viewer task' })).toBeTruthy());
  });
});
