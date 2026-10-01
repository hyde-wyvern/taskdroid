import { randomUUID } from "node:crypto";
import { defaultWorkflow } from "./defaults.js";
import { calculateProgress, taskEffort } from "./progress.js";
import {
  planSchema,
  projectSchema,
  SCHEMA_VERSION,
  subtaskSchema,
  taskSchema,
  TaskdroidError,
  workflowSchema,
  type Plan,
  type Subtask,
  type SubtaskInput,
  type Task,
  type TaskInput,
  type Workflow,
} from "./models.js";
import type { ZodType } from "zod";
import { JsonStore } from "./store.js";

type PlanInput = {
  title: string;
  summary?: string;
  sourcePlan?: string;
  statusId?: string;
  tasks?: TaskInput[];
};
type TaskChanges = Partial<
  Pick<Task, "title" | "description" | "plan" | "statusId" | "effort">
>;
type SubtaskChanges = Partial<
  Pick<Subtask, "title" | "description" | "plan" | "statusId" | "effort">
>;

export class TaskdroidService {
  constructor(public readonly store: JsonStore) {}

  static async initialize(
    root: string,
    name: string,
  ): Promise<TaskdroidService> {
    const now = timestamp();
    const project = parse(projectSchema, {
      id: randomUUID(),
      name,
      keyPrefix: projectKeyPrefix(name),
      nextIssueNumber: 1,
      schemaVersion: SCHEMA_VERSION,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
    return new TaskdroidService(
      await JsonStore.init(root, project, defaultWorkflow(now)),
    );
  }

  static async open(root: string): Promise<TaskdroidService> {
    const service = new TaskdroidService(new JsonStore(root));
    await service.migrateIssueKeys();
    return service;
  }

  async getProject() {
    const [project, workflow, plans, tasks, documents] = await Promise.all([
      this.store.readProject(),
      this.store.readWorkflow(),
      this.store.listPlans(),
      this.store.listTasks(),
      this.store.readDocuments(),
    ]);
    return {
      ...project,
      workflow,
      documents,
      plans: plans.map((plan) => ({
        ...plan,
        progress: calculateProgress(
          tasks.filter((task) => task.planId === plan.id),
          workflow,
        ),
      })),
    };
  }

  async updateProjectDocuments(
    expectedRevision: number,
    documents: Record<string, string>,
  ) {
    return this.store.withLock(async () => {
      const project = await this.store.readProject();
      assertRevision(project, expectedRevision);
      await this.store.writeDocuments(documents);
      const updated = parse(projectSchema, bump(project));
      await this.store.writeProject(updated);
      return updated;
    });
  }

  async listDocuments(): Promise<string[]> {
    return this.store.listDocumentNames();
  }

  async getDocument(name: string): Promise<{ name: string; content: string }> {
    return { name, content: await this.store.readDocument(name) };
  }

  async updateDocument(
    name: string,
    content: string,
    expectedRevision: number,
  ): Promise<{ name: string; content: string; projectRevision: number }> {
    return this.store.withLock(async () => {
      const project = await this.store.readProject();
      assertRevision(project, expectedRevision);
      await this.store.writeDocument(name, content);
      const updated = parse(projectSchema, bump(project));
      await this.store.writeProject(updated);
      return { name, content, projectRevision: updated.revision };
    });
  }

  async listPlans(includeArchived = false) {
    const [plans, tasks, workflow] = await Promise.all([
      this.store.listPlans(includeArchived),
      this.store.listTasks(includeArchived),
      this.store.readWorkflow(),
    ]);
    return plans.map((plan) => ({
      ...plan,
      progress: calculateProgress(
        tasks.filter((task) => task.planId === plan.id),
        workflow,
      ),
    }));
  }

  async getPlan(id: string, archived = false) {
    const [plan, tasks, workflow] = await Promise.all([
      this.store.readPlan(id, archived),
      this.store.listTasks(archived),
      this.store.readWorkflow(),
    ]);
    const planTasks = tasks.filter((task) => task.planId === id);
    return {
      ...plan,
      tasks: planTasks,
      progress: calculateProgress(planTasks, workflow),
    };
  }

  async getPlanByKey(key: string, archived = false) {
    const plan = (await this.store.listPlans(true)).find(
      (item) => item.key === key && Boolean(item.archivedAt) === archived,
    );
    if (!plan) throw new TaskdroidError("NOT_FOUND", "Plan not found");
    return this.getPlan(plan.id, archived);
  }

  async createPlan(input: PlanInput): Promise<Plan> {
    return this.store.withLock(async () => {
      const now = timestamp();
      const workflow = await this.store.readWorkflow();
      const statusId = input.statusId ?? "backlog";
      assertStatus(workflow, statusId);
      const plan = parse(planSchema, {
        id: randomUUID(),
        key: await this.nextIssueKey(),
        schemaVersion: SCHEMA_VERSION,
        revision: 1,
        createdAt: now,
        updatedAt: now,
        title: input.title,
        summary: input.summary ?? "",
        sourcePlan: input.sourcePlan ?? "",
        statusId,
        archivedAt: null,
      });
      await this.store.writePlan(plan);
      for (const taskInput of input.tasks ?? [])
        await this.writeNewTask(plan.id, taskInput, workflow);
      return plan;
    });
  }

  async updatePlan(
    id: string,
    expectedRevision: number,
    changes: Partial<
      Pick<Plan, "title" | "summary" | "sourcePlan" | "statusId">
    >,
  ): Promise<Plan> {
    return this.store.withLock(async () => {
      const plan = await this.store.readPlan(id);
      assertRevision(plan, expectedRevision);
      if (changes.statusId)
        assertStatus(await this.store.readWorkflow(), changes.statusId);
      const updated = parse(planSchema, {
        ...plan,
        ...defined(changes),
        revision: plan.revision + 1,
        updatedAt: timestamp(),
      });
      await this.store.writePlan(updated);
      return updated;
    });
  }

  async listTasks(
    filters: {
      planId?: string;
      statusId?: string;
      includeArchived?: boolean;
    } = {},
  ): Promise<Task[]> {
    return (await this.store.listTasks(filters.includeArchived)).filter(
      (task) =>
        (!filters.planId || task.planId === filters.planId) &&
        (!filters.statusId || task.statusId === filters.statusId),
    );
  }

  async getTask(id: string, archived = false): Promise<Task> {
    return this.store.readTask(id, archived);
  }

  async getTaskByKey(key: string, archived = false): Promise<Task> {
    const task = (await this.store.listTasks(true)).find(
      (item) => item.key === key && Boolean(item.archivedAt) === archived,
    );
    if (!task) throw new TaskdroidError("NOT_FOUND", "Task not found");
    return task;
  }

  async getSubtask(idOrKey: string): Promise<Subtask> {
    const tasks = await this.store.listTasks(true);
    for (const task of tasks) {
      const subtask = task.subtasks.find(
        (item) => item.id === idOrKey || item.key === idOrKey,
      );
      if (subtask) return subtask;
    }
    throw new TaskdroidError("NOT_FOUND", "Subtask not found");
  }

  async createTask(planId: string, input: TaskInput): Promise<Task> {
    return this.store.withLock(async () => {
      await this.store.readPlan(planId);
      return this.writeNewTask(planId, input, await this.store.readWorkflow());
    });
  }

  async updateTask(
    id: string,
    expectedRevision: number,
    changes: TaskChanges,
  ): Promise<Task> {
    return this.store.withLock(async () => {
      const task = await this.store.readTask(id);
      assertRevision(task, expectedRevision);
      if (
        changes.effort !== undefined &&
        task.subtasks.some((subtask) => !subtask.archivedAt)
      )
        throw new TaskdroidError(
          "EFFORT_DERIVED",
          "Task effort is derived from active subtasks",
        );
      const workflow = await this.store.readWorkflow();
      if (changes.statusId) assertStatus(workflow, changes.statusId);
      const updated = parse(taskSchema, bump({ ...task, ...defined(changes) }));
      await this.store.writeTask(updated);
      return updated;
    });
  }

  async claimTask(id: string, expectedRevision: number): Promise<Task> {
    const workflow = await this.store.readWorkflow();
    return this.updateTask(id, expectedRevision, {
      statusId: workflow.startStatusId,
    });
  }

  async planTask(
    id: string,
    expectedRevision: number,
    plan: string,
    subtasks: SubtaskInput[],
    replace = true,
  ): Promise<Task> {
    return this.store.withLock(async () => {
      const task = await this.store.readTask(id);
      assertRevision(task, expectedRevision);
      const workflow = await this.store.readWorkflow();
      const created: Subtask[] = [];
      for (const input of subtasks)
        created.push(
          makeSubtask(task.id, await this.nextIssueKey(), input, workflow),
        );
      const nextSubtasks = replace ? created : task.subtasks.concat(created);
      const updated = parse(
        taskSchema,
        bump({
          ...task,
          plan,
          subtasks: nextSubtasks,
          effort: activeEffort(nextSubtasks, task.effort),
        }),
      );
      await this.store.writeTask(updated);
      return updated;
    });
  }

  async createSubtask(
    taskId: string,
    expectedRevision: number,
    input: SubtaskInput,
  ): Promise<Task> {
    return this.store.withLock(async () => {
      const task = await this.store.readTask(taskId);
      assertRevision(task, expectedRevision);
      const subtask = makeSubtask(
        task.id,
        await this.nextIssueKey(),
        input,
        await this.store.readWorkflow(),
      );
      const subtasks = task.subtasks.concat(subtask);
      const updated = parse(
        taskSchema,
        bump({
          ...task,
          subtasks,
          effort: activeEffort(subtasks, task.effort),
        }),
      );
      await this.store.writeTask(updated);
      return updated;
    });
  }

  async updateSubtask(
    taskId: string,
    subtaskId: string,
    expectedRevision: number,
    changes: SubtaskChanges,
  ): Promise<Task> {
    return this.store.withLock(async () => {
      const task = await this.store.readTask(taskId);
      assertRevision(task, expectedRevision);
      const workflow = await this.store.readWorkflow();
      if (changes.statusId) assertStatus(workflow, changes.statusId);
      let found = false;
      const subtasks = task.subtasks.map((subtask) => {
        if (subtask.id !== subtaskId) return subtask;
        found = true;
        return parse(subtaskSchema, bump({ ...subtask, ...defined(changes) }));
      });
      if (!found) throw new TaskdroidError("NOT_FOUND", "Subtask not found");
      const updated = parse(
        taskSchema,
        bump({
          ...task,
          subtasks,
          effort: activeEffort(subtasks, task.effort),
        }),
      );
      await this.store.writeTask(updated);
      return updated;
    });
  }

  async moveWorkItem(
    kind: "plan" | "task" | "subtask",
    id: string,
    statusId: string,
    expectedRevision: number,
    taskId?: string,
  ): Promise<Plan | Task> {
    if (kind === "plan")
      return this.updatePlan(id, expectedRevision, { statusId });
    return kind === "task"
      ? this.updateTask(id, expectedRevision, { statusId })
      : this.updateSubtask(required(taskId, "taskId"), id, expectedRevision, {
          statusId,
        });
  }

  async archivePlan(id: string, expectedRevision: number): Promise<Plan> {
    return this.setPlanArchived(id, expectedRevision, true);
  }
  async restorePlan(id: string, expectedRevision: number): Promise<Plan> {
    return this.setPlanArchived(id, expectedRevision, false);
  }

  async archiveWorkItem(
    kind: "task" | "subtask",
    id: string,
    expectedRevision: number,
    taskId?: string,
  ): Promise<Task> {
    return kind === "task"
      ? this.setTaskArchived(id, expectedRevision, true)
      : this.setSubtaskArchived(
          required(taskId, "taskId"),
          id,
          expectedRevision,
          true,
        );
  }

  async restoreWorkItem(
    kind: "task" | "subtask",
    id: string,
    expectedRevision: number,
    taskId?: string,
  ): Promise<Task> {
    return kind === "task"
      ? this.setTaskArchived(id, expectedRevision, false)
      : this.setSubtaskArchived(
          required(taskId, "taskId"),
          id,
          expectedRevision,
          false,
        );
  }

  async getWorkflow(): Promise<Workflow> {
    return this.store.readWorkflow();
  }

  async updateWorkflow(
    expectedRevision: number,
    input: Pick<Workflow, "statuses" | "startStatusId">,
    replacements: Record<string, string> = {},
  ): Promise<Workflow> {
    return this.store.withLock(async () => {
      const current = await this.store.readWorkflow();
      assertRevision(current, expectedRevision);
      const now = timestamp();
      const next = parse(workflowSchema, {
        ...input,
        schemaVersion: SCHEMA_VERSION,
        revision: current.revision + 1,
        updatedAt: now,
      });
      const removed = current.statuses
        .map((status) => status.id)
        .filter((id) => !next.statuses.some((status) => status.id === id));
      const tasks = await this.store.listTasks(true);
      const plans = await this.store.listPlans(true);
      const usedRemoved = [
        ...plans.map((plan) => plan.statusId),
        ...tasks.flatMap((task) => [
          task.statusId,
          ...task.subtasks.map((subtask) => subtask.statusId),
        ]),
      ].filter((id) => removed.includes(id));
      const missingReplacements = [
        ...new Set(usedRemoved.filter((id) => !replacements[id])),
      ];
      if (missingReplacements.length)
        throw new TaskdroidError(
          "STATUS_IN_USE",
          "Removed status is in use and requires a replacement",
          { statusIds: missingReplacements },
        );
      for (const plan of plans) {
        if (!removed.includes(plan.statusId)) continue;
        await this.store.writePlan(
          bump({ ...plan, statusId: replacements[plan.statusId] }),
          Boolean(plan.archivedAt),
        );
      }
      for (const task of tasks) {
        const revised = {
          ...task,
          statusId: replacements[task.statusId] ?? task.statusId,
          subtasks: task.subtasks.map((subtask) => ({
            ...subtask,
            statusId: replacements[subtask.statusId] ?? subtask.statusId,
          })),
        };
        if (JSON.stringify(revised) !== JSON.stringify(task))
          await this.store.writeTask(bump(revised), Boolean(task.archivedAt));
      }
      await this.store.writeWorkflow(next);
      return next;
    });
  }

  async validate(): Promise<{ valid: true; plans: number; tasks: number }> {
    const [project, workflow, plans, tasks] = await Promise.all([
      this.store.readProject(),
      this.store.readWorkflow(),
      this.store.listPlans(true),
      this.store.listTasks(true),
    ]);
    const statuses = new Set(workflow.statuses.map((status) => status.id));
    const planIds = new Set(plans.map((plan) => plan.id));
    const keys = [
      ...plans.map((plan) => plan.key),
      ...tasks.flatMap((task) => [
        task.key,
        ...task.subtasks.map((subtask) => subtask.key),
      ]),
    ];
    if (
      !project.keyPrefix ||
      !project.nextIssueNumber ||
      keys.some((key) => !key) ||
      new Set(keys).size !== keys.length
    )
      throw new TaskdroidError(
        "INVALID_ISSUE_KEYS",
        "Project work item keys are missing or duplicated",
      );
    for (const plan of plans)
      if (!statuses.has(plan.statusId))
        throw new TaskdroidError(
          "INVALID_REFERENCE",
          `Plan ${plan.id} references missing status`,
        );
    for (const task of tasks) {
      if (!planIds.has(task.planId))
        throw new TaskdroidError(
          "INVALID_REFERENCE",
          `Task ${task.id} references missing plan`,
        );
      if (
        !statuses.has(task.statusId) ||
        task.subtasks.some((item) => !statuses.has(item.statusId))
      )
        throw new TaskdroidError(
          "INVALID_REFERENCE",
          `Task ${task.id} references missing status`,
        );
      if (
        task.subtasks.some((item) => !item.archivedAt) &&
        task.effort !== taskEffort(task)
      )
        throw new TaskdroidError(
          "INVALID_EFFORT",
          `Task ${task.id} has stale derived effort`,
        );
    }
    return { valid: true, plans: plans.length, tasks: tasks.length };
  }

  private async writeNewTask(
    planId: string,
    input: TaskInput,
    workflow: Workflow,
  ): Promise<Task> {
    assertEffort(input.effort);
    const now = timestamp();
    const statusId = input.statusId ?? "backlog";
    assertStatus(workflow, statusId);
    const task = parse(taskSchema, {
      id: randomUUID(),
      key: await this.nextIssueKey(),
      planId,
      schemaVersion: SCHEMA_VERSION,
      revision: 1,
      createdAt: now,
      updatedAt: now,
      title: input.title,
      description: input.description ?? "",
      plan: "",
      statusId,
      effort: input.effort,
      archivedAt: null,
      subtasks: [],
    });
    await this.store.writeTask(task);
    return task;
  }

  private async setPlanArchived(
    id: string,
    expectedRevision: number,
    archive: boolean,
  ): Promise<Plan> {
    return this.store.withLock(async () => {
      const plan = await this.store.readPlan(id, !archive);
      assertRevision(plan, expectedRevision);
      const workflow = await this.store.readWorkflow();
      const statusId = archive
        ? plan.statusId
        : validRestoreStatus(workflow, plan.previousStatusId);
      const updated = bump({
        ...plan,
        archivedAt: archive ? timestamp() : null,
        previousStatusId: archive ? plan.statusId : null,
        statusId,
      });
      await this.store.moveRecord("plans", id, archive);
      await this.store.writePlan(updated, archive);
      return updated;
    });
  }

  private async setTaskArchived(
    id: string,
    expectedRevision: number,
    archive: boolean,
  ): Promise<Task> {
    return this.store.withLock(async () => {
      const task = await this.store.readTask(id, !archive);
      assertRevision(task, expectedRevision);
      const workflow = await this.store.readWorkflow();
      const statusId = archive
        ? task.statusId
        : validRestoreStatus(workflow, task.previousStatusId);
      const updated = bump({
        ...task,
        archivedAt: archive ? timestamp() : null,
        previousStatusId: archive ? task.statusId : null,
        statusId,
      });
      await this.store.moveRecord("tasks", id, archive);
      await this.store.writeTask(updated, archive);
      return updated;
    });
  }

  private async setSubtaskArchived(
    taskId: string,
    id: string,
    expectedRevision: number,
    archive: boolean,
  ): Promise<Task> {
    return this.store.withLock(async () => {
      const task = await this.store.readTask(taskId);
      assertRevision(task, expectedRevision);
      const workflow = await this.store.readWorkflow();
      let found = false;
      const subtasks = task.subtasks.map((subtask) => {
        if (subtask.id !== id) return subtask;
        found = true;
        return bump({
          ...subtask,
          archivedAt: archive ? timestamp() : null,
          previousStatusId: archive ? subtask.statusId : null,
          statusId: archive
            ? subtask.statusId
            : validRestoreStatus(workflow, subtask.previousStatusId),
        });
      });
      if (!found) throw new TaskdroidError("NOT_FOUND", "Subtask not found");
      const updated = bump({
        ...task,
        subtasks,
        effort: activeEffort(subtasks, task.effort),
      });
      await this.store.writeTask(updated);
      return updated;
    });
  }

  private async nextIssueKey(): Promise<string> {
    const project = await this.store.readProject();
    const keyPrefix = project.keyPrefix ?? projectKeyPrefix(project.name);
    const issueNumber = project.nextIssueNumber ?? 1;
    await this.store.writeProject(
      parse(projectSchema, {
        ...project,
        keyPrefix,
        nextIssueNumber: issueNumber + 1,
        revision: project.revision + 1,
        updatedAt: timestamp(),
      }),
    );
    return `${keyPrefix}-${issueNumber}`;
  }

  private async migrateIssueKeys(): Promise<void> {
    await this.store.withLock(async () => {
      const project = await this.store.readProject();
      const plans = await this.store.listPlans(true);
      const tasks = await this.store.listTasks(true);
      const keyPrefix = project.keyPrefix ?? projectKeyPrefix(project.name);
      const existingNumbers = [
        ...plans.map((item) => item.key),
        ...tasks.flatMap((task) => [
          task.key,
          ...task.subtasks.map((item) => item.key),
        ]),
      ].flatMap((key) =>
        key?.startsWith(`${keyPrefix}-`)
          ? [Number(key.slice(keyPrefix.length + 1))]
          : [],
      );
      let nextIssueNumber = Math.max(
        project.nextIssueNumber ?? 1,
        ...existingNumbers.map((number) => number + 1),
      );
      const ordered = [
        ...plans.map((record) => ({
          type: "plan" as const,
          createdAt: record.createdAt,
          record,
        })),
        ...tasks.map((record) => ({
          type: "task" as const,
          createdAt: record.createdAt,
          record,
        })),
      ].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
      for (const item of ordered) {
        if (item.type === "plan") {
          if (item.record.key) continue;
          await this.store.writePlan(
            { ...item.record, key: `${keyPrefix}-${nextIssueNumber++}` },
            Boolean(item.record.archivedAt),
          );
          continue;
        }
        let changed = false;
        const key = item.record.key ?? `${keyPrefix}-${nextIssueNumber++}`;
        if (!item.record.key) changed = true;
        const subtasks = item.record.subtasks.map((subtask) => {
          if (subtask.key) return subtask;
          changed = true;
          return { ...subtask, key: `${keyPrefix}-${nextIssueNumber++}` };
        });
        if (changed)
          await this.store.writeTask(
            { ...item.record, key, subtasks },
            Boolean(item.record.archivedAt),
          );
      }
      if (
        project.keyPrefix !== keyPrefix ||
        project.nextIssueNumber !== nextIssueNumber
      ) {
        await this.store.writeProject(
          parse(projectSchema, {
            ...project,
            keyPrefix,
            nextIssueNumber,
            revision: project.revision + 1,
            updatedAt: timestamp(),
          }),
        );
      }
    });
  }
}

function makeSubtask(
  taskId: string,
  key: string,
  input: SubtaskInput,
  workflow: Workflow,
): Subtask {
  assertEffort(input.effort);
  const now = timestamp();
  const statusId = input.statusId ?? "backlog";
  assertStatus(workflow, statusId);
  return parse(subtaskSchema, {
    id: randomUUID(),
    key,
    taskId,
    schemaVersion: SCHEMA_VERSION,
    revision: 1,
    createdAt: now,
    updatedAt: now,
    title: input.title,
    description: input.description ?? "",
    plan: input.plan ?? "",
    statusId,
    effort: input.effort,
    archivedAt: null,
  });
}

function assertRevision(record: { revision: number }, expected: number): void {
  if (record.revision !== expected)
    throw new TaskdroidError(
      "REVISION_CONFLICT",
      `Expected revision ${expected}, found ${record.revision}`,
      { currentRevision: record.revision },
    );
}
function assertStatus(workflow: Workflow, id: string): void {
  if (!workflow.statuses.some((status) => status.id === id))
    throw new TaskdroidError("INVALID_STATUS", `Unknown status: ${id}`);
}
function assertEffort(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 100)
    throw new TaskdroidError(
      "INVALID_EFFORT",
      "Effort must be an integer from 0 through 100",
    );
}
function activeEffort(subtasks: Subtask[], fallback: number): number {
  const active = subtasks.filter((item) => !item.archivedAt);
  return active.length
    ? active.reduce((sum, item) => sum + item.effort, 0)
    : fallback;
}
function validRestoreStatus(
  workflow: Workflow,
  previous?: string | null,
): string {
  return previous && workflow.statuses.some((status) => status.id === previous)
    ? previous
    : "backlog";
}
function bump<T extends { revision: number; updatedAt: string }>(record: T): T {
  return { ...record, revision: record.revision + 1, updatedAt: timestamp() };
}
function timestamp(): string {
  return new Date().toISOString();
}
function defined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}
function required(value: string | undefined, name: string): string {
  if (!value) throw new TaskdroidError("INVALID_INPUT", `${name} is required`);
  return value;
}
function projectKeyPrefix(name: string): string {
  const words = name
    .normalize("NFD")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const candidate =
    words.length > 1
      ? words.map((word) => word[0]).join("")
      : words[0]?.slice(0, 3);
  const prefix = (candidate || "TD")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  return prefix.length >= 2 ? prefix : `${prefix}D`;
}
function parse<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new TaskdroidError(
      "INVALID_INPUT",
      result.error.issues.map((issue) => issue.message).join("; "),
      result.error.issues,
    );
  return result.data;
}
