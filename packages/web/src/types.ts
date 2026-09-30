export type Status = { id: string; name: string; color: string; completed: boolean; fixed?: 'backlog' | 'closed' };
export type Workflow = { schemaVersion: 1; revision: number; updatedAt: string; startStatusId: string; statuses: Status[] };
export type Progress = { completedEffort: number; totalEffort: number; percentage: number };
type Timestamped = { createdAt?: string; updatedAt?: string };
export type Plan = Timestamped & { id: string; key?: string; revision: number; title: string; summary: string; sourcePlan: string; statusId: string; archivedAt: string | null; progress: Progress };
export type Subtask = Timestamped & { id: string; key?: string; revision: number; taskId: string; title: string; description: string; plan: string; statusId: string; effort: number; archivedAt: string | null };
export type Task = Timestamped & { id: string; key?: string; revision: number; planId: string; title: string; description: string; plan: string; statusId: string; effort: number; archivedAt: string | null; subtasks: Subtask[] };
export type Project = { id: string; revision: number; name: string; keyPrefix?: string; nextIssueNumber?: number; workflow: Workflow; documents: Record<string, string>; plans: Plan[] };
