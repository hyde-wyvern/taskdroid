import type { Plan, Project, Task, Workflow } from './types';

export class ApiError extends Error {
  constructor(public code: string, message: string, public details?: unknown) { super(message); }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, headers: { 'content-type': 'application/json', ...options?.headers } });
  const body = await response.json();
  if (!response.ok) throw new ApiError(body.error?.code ?? 'REQUEST_FAILED', body.error?.message ?? 'Request failed', body.error?.details);
  return body;
}

export const api = {
  project: () => request<Project>('/project'),
  updateProjectDocuments: (project: Project, documents: Project['documents']) => request<Project>('/project/documents', { method: 'PUT', body: JSON.stringify({ expectedRevision: project.revision, documents }) }),
  plans: (archived = false) => request<Plan[]>(`/plans?archived=${archived}`),
  createPlan: (input: { title: string; summary: string; sourcePlan: string }) => request<Plan>('/plans', { method: 'POST', body: JSON.stringify(input) }),
  updatePlan: (id: string, expectedRevision: number, changes: object) => request<Plan>(`/plans/${id}`, { method: 'PATCH', body: JSON.stringify({ expectedRevision, changes }) }),
  movePlan: (plan: Plan, statusId: string) => request<Plan>(`/plans/${plan.id}`, { method: 'PATCH', body: JSON.stringify({ expectedRevision: plan.revision, changes: { statusId } }) }),
  archivePlan: (plan: Plan) => request<Plan>(`/plans/${plan.id}/archive`, { method: 'POST', body: JSON.stringify({ expectedRevision: plan.revision }) }),
  restorePlan: (plan: Plan) => request<Plan>(`/plans/${plan.id}/restore`, { method: 'POST', body: JSON.stringify({ expectedRevision: plan.revision }) }),
  tasks: (planId?: string, archived = false) => request<Task[]>(`/tasks?${new URLSearchParams({ ...(planId ? { planId } : {}), archived: String(archived) })}`),
  createTask: (planId: string, task: object) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify({ planId, task }) }),
  updateTask: (task: Task, changes: object) => request<Task>(`/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ expectedRevision: task.revision, changes }) }),
  move: (task: Task, statusId: string) => request<Task>(`/work-items/${task.id}/move`, { method: 'POST', body: JSON.stringify({ kind: 'task', statusId, expectedRevision: task.revision }) }),
  archiveTask: (task: Task) => request<Task>(`/work-items/${task.id}/archive`, { method: 'POST', body: JSON.stringify({ kind: 'task', expectedRevision: task.revision }) }),
  restoreTask: (task: Task) => request<Task>(`/work-items/${task.id}/restore`, { method: 'POST', body: JSON.stringify({ kind: 'task', expectedRevision: task.revision }) }),
  createSubtask: (task: Task, subtask: object) => request<Task>(`/tasks/${task.id}/subtasks`, { method: 'POST', body: JSON.stringify({ expectedRevision: task.revision, subtask }) }),
  updateSubtask: (task: Task, id: string, changes: object) => request<Task>(`/tasks/${task.id}/subtasks/${id}`, { method: 'PATCH', body: JSON.stringify({ expectedRevision: task.revision, changes }) }),
  archiveSubtask: (task: Task, id: string) => request<Task>(`/work-items/${id}/archive`, { method: 'POST', body: JSON.stringify({ kind: 'subtask', taskId: task.id, expectedRevision: task.revision }) }),
  restoreSubtask: (task: Task, id: string) => request<Task>(`/work-items/${id}/restore`, { method: 'POST', body: JSON.stringify({ kind: 'subtask', taskId: task.id, expectedRevision: task.revision }) }),
  updateWorkflow: (workflow: Workflow, next: Pick<Workflow, 'statuses' | 'startStatusId'>, replacements: Record<string, string> = {}) => request<Workflow>('/workflow', { method: 'PUT', body: JSON.stringify({ expectedRevision: workflow.revision, workflow: next, replacements }) }),
};
