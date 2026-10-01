import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TaskdroidError } from './models.js';
import { TaskdroidService } from './service.js';

const roots: string[] = [];
async function service() { const root = await mkdtemp(join(tmpdir(), 'taskdroid-test-')); roots.push(root); return TaskdroidService.initialize(root, 'Test'); }
afterEach(async () => Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))));

describe('TaskdroidService', () => {
  it('runs plan-to-completion flow', async () => {
    const app = await service();
    const plan = await app.createPlan({ title: 'Feature', sourcePlan: '# Plan', tasks: [{ title: 'Build', effort: 50 }] });
    let task = (await app.listTasks({ planId: plan.id }))[0];
    task = await app.claimTask(task.id, task.revision);
    expect(task.statusId).toBe('in-progress');
    task = await app.planTask(task.id, task.revision, 'Detailed plan', [{ title: 'A', effort: 20 }, { title: 'B', effort: 30 }]);
    expect(task.effort).toBe(50);
    task = await app.updateSubtask(task.id, task.subtasks[0].id, task.revision, { description: 'Subtask description', plan: 'Subtask plan' });
    expect(task.subtasks[0]).toMatchObject({ description: 'Subtask description', plan: 'Subtask plan' });
    task = await app.updateSubtask(task.id, task.subtasks[0].id, task.revision, { statusId: 'done' });
    task = await app.updateSubtask(task.id, task.subtasks[1].id, task.revision, { statusId: 'closed' });
    expect((await app.getPlan(plan.id)).progress.percentage).toBe(100);
  });

  it('rejects stale revisions and direct parent effort edits', async () => {
    const app = await service();
    const plan = await app.createPlan({ title: 'Feature' });
    let task = await app.createTask(plan.id, { title: 'Build', effort: 10 });
    await expect(app.updateTask(task.id, task.revision + 1, { title: 'Wrong' })).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    task = await app.createSubtask(task.id, task.revision, { title: 'Child', effort: 4 });
    await expect(app.updateTask(task.id, task.revision, { effort: 6 })).rejects.toMatchObject({ code: 'EFFORT_DERIVED' });
  });

  it('archives and restores a task', async () => {
    const app = await service();
    const plan = await app.createPlan({ title: 'Feature' });
    let task = await app.createTask(plan.id, { title: 'Build', effort: 10, statusId: 'todo' });
    task = await app.archiveWorkItem('task', task.id, task.revision);
    expect(await app.listTasks({ planId: plan.id })).toHaveLength(0);
    task = await app.restoreWorkItem('task', task.id, task.revision);
    expect(task.statusId).toBe('todo');
    expect(await app.validate()).toEqual({ valid: true, plans: 1, tasks: 1 });
  });

  it('assigns immutable project keys across all levels without reusing archived numbers', async () => {
    const app = await service();
    const plan = await app.createPlan({ title: 'Feature' });
    let task = await app.createTask(plan.id, { title: 'Build', effort: 10 });
    task = await app.createSubtask(task.id, task.revision, { title: 'Child', effort: 4 });
    expect([plan.key, task.key, task.subtasks[0].key]).toEqual(['TES-1', 'TES-2', 'TES-3']);
    await app.archiveWorkItem('task', task.id, task.revision);
    const next = await app.createTask(plan.id, { title: 'Next', effort: 5 });
    expect(next.key).toBe('TES-4');
    expect((await app.getProject()).nextIssueNumber).toBe(5);
  });

  it('migrates existing keyless JSON idempotently on open', async () => {
    const root = await mkdtemp(join(tmpdir(), 'taskdroid-migration-'));
    roots.push(root);
    const original = await TaskdroidService.initialize(root, 'Legacy Project');
    const plan = await original.createPlan({ title: 'Feature' });
    const task = await original.createTask(plan.id, { title: 'Build', effort: 5 });
    const projectPath = join(root, '.taskdroid', 'project.json');
    const planPath = join(root, '.taskdroid', 'plans', `${plan.id}.json`);
    const taskPath = join(root, '.taskdroid', 'tasks', `${task.id}.json`);
    for (const path of [projectPath, planPath, taskPath]) {
      const record = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
      delete record.key; delete record.keyPrefix; delete record.nextIssueNumber;
      await writeFile(path, `${JSON.stringify(record, null, 2)}\n`);
    }
    const migrated = await TaskdroidService.open(root);
    const firstKeys = [(await migrated.listPlans())[0].key, (await migrated.listTasks())[0].key];
    const reopened = await TaskdroidService.open(root);
    expect([(await reopened.listPlans())[0].key, (await reopened.listTasks())[0].key]).toEqual(firstKeys);
    expect(new Set(firstKeys).size).toBe(2);
  });

  it('tracks plan status through update, archive, and restore', async () => {
    const app = await service();
    let plan = await app.createPlan({ title: 'Feature' });
    expect(plan.statusId).toBe('backlog');
    plan = await app.updatePlan(plan.id, plan.revision, { statusId: 'in-progress' });
    plan = await app.archivePlan(plan.id, plan.revision);
    plan = await app.restorePlan(plan.id, plan.revision);
    expect(plan.statusId).toBe('in-progress');
  });

  it('reads and updates individual project documents with revisions', async () => {
    const app = await service();
    const project = await app.getProject();
    expect(await app.listDocuments()).toEqual(expect.arrayContaining(['agents.md', 'architecture.md']));
    const updated = await app.updateDocument('agents.md', '# Agent rules', project.revision);
    expect(updated.projectRevision).toBe(project.revision + 1);
    await expect(app.updateDocument('agents.md', 'stale', project.revision)).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(await app.getDocument('agents.md')).toEqual({ name: 'agents.md', content: '# Agent rules' });
  });

  it('validates workflow removals and replacement', async () => {
    const app = await service();
    const plan = await app.createPlan({ title: 'Feature' });
    await app.createTask(plan.id, { title: 'Build', effort: 10, statusId: 'todo' });
    const workflow = await app.getWorkflow();
    const statuses = workflow.statuses.filter((status) => status.id !== 'todo');
    await expect(app.updateWorkflow(workflow.revision, { statuses, startStatusId: workflow.startStatusId })).rejects.toBeInstanceOf(TaskdroidError);
    const next = await app.updateWorkflow(workflow.revision, { statuses, startStatusId: workflow.startStatusId }, { todo: 'backlog' });
    expect(next.statuses.some((status) => status.id === 'todo')).toBe(false);
  });
});
