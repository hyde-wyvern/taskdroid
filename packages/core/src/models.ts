import { z } from 'zod';

export const SCHEMA_VERSION = 1;
export const idSchema = z.string().min(1);
export const effortSchema = z.number().int().min(0).max(100);

const recordFields = {
  id: idSchema,
  key: z.string().regex(/^[A-Z][A-Z0-9]{1,9}-[1-9][0-9]*$/).optional(),
  schemaVersion: z.literal(SCHEMA_VERSION),
  revision: z.number().int().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};

export const projectSchema = z.object({
  ...recordFields,
  name: z.string().min(1),
  keyPrefix: z.string().regex(/^[A-Z][A-Z0-9]{1,9}$/).optional(),
  nextIssueNumber: z.number().int().positive().optional(),
});

export const statusSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  completed: z.boolean(),
  fixed: z.enum(['backlog', 'closed']).optional(),
});

export const workflowSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  revision: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  startStatusId: idSchema,
  statuses: z.array(statusSchema).min(3),
}).superRefine((workflow, context) => {
  const ids = workflow.statuses.map((status) => status.id);
  if (new Set(ids).size !== ids.length) context.addIssue({ code: 'custom', message: 'Status IDs must be unique' });
  if (workflow.statuses[0]?.fixed !== 'backlog') context.addIssue({ code: 'custom', message: 'Backlog must be first' });
  if (workflow.statuses.at(-1)?.fixed !== 'closed') context.addIssue({ code: 'custom', message: 'Closed must be last' });
  const backlog = workflow.statuses.filter((status) => status.fixed === 'backlog');
  const closed = workflow.statuses.filter((status) => status.fixed === 'closed');
  if (backlog.length !== 1 || closed.length !== 1) context.addIssue({ code: 'custom', message: 'Workflow requires one Backlog and one Closed status' });
  if (workflow.statuses[0]?.id !== 'backlog' || workflow.statuses[0]?.name !== 'Backlog' || workflow.statuses[0]?.completed) context.addIssue({ code: 'custom', message: 'Backlog identity, name, and completion are fixed' });
  const last = workflow.statuses.at(-1);
  if (last?.id !== 'closed' || last.name !== 'Closed' || !last.completed) context.addIssue({ code: 'custom', message: 'Closed identity, name, and completion are fixed' });
  if (!ids.includes(workflow.startStatusId) || ['backlog', 'closed'].includes(workflow.statuses.find((s) => s.id === workflow.startStatusId)?.fixed ?? '')) {
    context.addIssue({ code: 'custom', message: 'Start status must reference a middle status' });
  }
});

export const planSchema = z.object({
  ...recordFields,
  title: z.string().min(1),
  summary: z.string(),
  sourcePlan: z.string(),
  statusId: idSchema.default('backlog'),
  archivedAt: z.string().datetime().nullable(),
  previousStatusId: idSchema.nullable().optional(),
});

export const subtaskSchema = z.object({
  ...recordFields,
  taskId: idSchema,
  title: z.string().min(1),
  description: z.string(),
  plan: z.string().default(''),
  statusId: idSchema,
  effort: effortSchema,
  archivedAt: z.string().datetime().nullable(),
  previousStatusId: idSchema.nullable().optional(),
});

export const taskSchema = z.object({
  ...recordFields,
  planId: idSchema,
  title: z.string().min(1),
  description: z.string(),
  plan: z.string(),
  statusId: idSchema,
  effort: z.number().int().nonnegative(),
  archivedAt: z.string().datetime().nullable(),
  previousStatusId: idSchema.nullable().optional(),
  subtasks: z.array(subtaskSchema),
}).superRefine((task, context) => {
  if (!task.subtasks.some((subtask) => !subtask.archivedAt) && task.effort > 100) context.addIssue({ code: 'custom', path: ['effort'], message: 'Unsliced task effort cannot exceed 100' });
});

export type Project = z.infer<typeof projectSchema>;
export type Workflow = z.infer<typeof workflowSchema>;
export type Status = z.infer<typeof statusSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Subtask = z.infer<typeof subtaskSchema>;

export type TaskInput = {
  title: string;
  description?: string;
  effort: number;
  statusId?: string;
};

export type SubtaskInput = TaskInput & { plan?: string };

export class TaskdroidError extends Error {
  constructor(public code: string, message: string, public details?: unknown) {
    super(message);
    this.name = 'TaskdroidError';
  }
}
