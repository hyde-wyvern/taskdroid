import { mkdir, readFile, rename, writeFile, access, readdir, unlink, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import lockfile from 'proper-lockfile';
import type { ZodType } from 'zod';
import { planSchema, projectSchema, taskSchema, TaskdroidError, workflowSchema, type Plan, type Project, type Task, type Workflow } from './models.js';

const ROOT = '.taskdroid';

async function exists(path: string): Promise<boolean> {
  try { await access(path); return true; } catch { return false; }
}

export async function findProjectRoot(start = process.cwd()): Promise<string> {
  let current = resolve(start);
  while (true) {
    if (await exists(join(current, ROOT, 'project.json'))) return current;
    const parent = dirname(current);
    if (parent === current) throw new TaskdroidError('PROJECT_NOT_FOUND', 'No Taskdroid project found. Run taskdroid init.');
    current = parent;
  }
}

export class JsonStore {
  readonly dataDir: string;

  constructor(public readonly projectRoot: string) {
    this.dataDir = join(projectRoot, ROOT);
  }

  static async init(projectRoot: string, project: Project, workflow: Workflow): Promise<JsonStore> {
    const store = new JsonStore(resolve(projectRoot));
    if (await exists(join(store.dataDir, 'project.json'))) throw new TaskdroidError('ALREADY_INITIALIZED', 'Project already initialized');
    await Promise.all([
      mkdir(join(store.dataDir, 'plans'), { recursive: true }),
      mkdir(join(store.dataDir, 'tasks'), { recursive: true }),
      mkdir(join(store.dataDir, 'archive', 'plans'), { recursive: true }),
      mkdir(join(store.dataDir, 'archive', 'tasks'), { recursive: true }),
    ]);
    await store.writeJson('project.json', project);
    await store.writeJson('workflow.json', workflow);
    await Promise.all(['description.md', 'architecture.md', 'AGENTS.md'].map((file) => store.writeText(`docs/${file}`, '')));
    return store;
  }

  async withLock<T>(action: () => Promise<T>): Promise<T> {
    const release = await lockfile.lock(this.dataDir, { realpath: false, retries: { retries: 8, minTimeout: 20, maxTimeout: 200 } });
    try { return await action(); } finally { await release(); }
  }

  async readProject(): Promise<Project> { return this.readJson('project.json', projectSchema); }
  async writeProject(value: Project): Promise<void> { await this.writeJson('project.json', value); }
  async readText(relative: string): Promise<string> { try { return await readFile(join(this.dataDir, relative), 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''; throw new TaskdroidError('INVALID_DATA', `Cannot read ${relative}`); } }
  async writeText(relative: string, value: string): Promise<void> {
    const target = join(this.dataDir, relative);
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(dirname(target), { recursive: true }); await writeFile(temporary, value, 'utf8'); await rename(temporary, target);
  }
  async readDocuments(): Promise<Record<string, string>> {
    const directory = join(this.dataDir, 'docs');
    let names: string[] = [];
    try { names = (await readdir(directory)).filter((name) => name.endsWith('.md')); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    names = (await Promise.all(names.map(async (name) => ({ name, createdAt: (await stat(join(directory, name))).birthtimeMs })))).sort((left, right) => left.createdAt - right.createdAt).map(({ name }) => name);
    return Object.fromEntries(await Promise.all(names.map(async (name) => [name, await this.readText(`docs/${name}`)] as const)));
  }
  async listDocumentNames(): Promise<string[]> { return Object.keys(await this.readDocuments()); }
  async readDocument(name: string): Promise<string> {
    const relative = `docs/${safeDocumentName(name)}`;
    if (!await exists(join(this.dataDir, relative))) throw new TaskdroidError('DOCUMENT_NOT_FOUND', `Document not found: ${name}`);
    return this.readText(relative);
  }
  async writeDocument(name: string, content: string): Promise<void> { await this.writeText(`docs/${safeDocumentName(name)}`, content); }
  async writeDocuments(documents: Record<string, string>): Promise<void> {
    const directory = join(this.dataDir, 'docs');
    await mkdir(directory, { recursive: true });
    const names = await readdir(directory);
    await Promise.all(names.filter((name) => name.endsWith('.md') && !Object.hasOwn(documents, name)).map((name) => unlink(join(directory, name))));
    await Promise.all(Object.entries(documents).map(([name, content]) => this.writeText(`docs/${safeDocumentName(name)}`, content)));
  }
  async readWorkflow(): Promise<Workflow> { return this.readJson('workflow.json', workflowSchema); }
  async writeWorkflow(value: Workflow): Promise<void> { await this.writeJson('workflow.json', value); }
  async readPlan(id: string, archived = false): Promise<Plan> { return this.readJson(`${archived ? 'archive/' : ''}plans/${safeId(id)}.json`, planSchema); }
  async writePlan(value: Plan, archived = false): Promise<void> { await this.writeJson(`${archived ? 'archive/' : ''}plans/${safeId(value.id)}.json`, value); }
  async readTask(id: string, archived = false): Promise<Task> { return this.readJson(`${archived ? 'archive/' : ''}tasks/${safeId(id)}.json`, taskSchema); }
  async writeTask(value: Task, archived = false): Promise<void> { await this.writeJson(`${archived ? 'archive/' : ''}tasks/${safeId(value.id)}.json`, value); }

  async listPlans(includeArchived = false): Promise<Plan[]> {
    const current = await this.readDirectory('plans', planSchema);
    return includeArchived ? current.concat(await this.readDirectory('archive/plans', planSchema)) : current;
  }

  async listTasks(includeArchived = false): Promise<Task[]> {
    const current = await this.readDirectory('tasks', taskSchema);
    return includeArchived ? current.concat(await this.readDirectory('archive/tasks', taskSchema)) : current;
  }

  async moveRecord(kind: 'plans' | 'tasks', id: string, archive: boolean): Promise<void> {
    const source = archive ? join(this.dataDir, kind, `${safeId(id)}.json`) : join(this.dataDir, 'archive', kind, `${safeId(id)}.json`);
    const target = archive ? join(this.dataDir, 'archive', kind, `${safeId(id)}.json`) : join(this.dataDir, kind, `${safeId(id)}.json`);
    await rename(source, target);
  }

  private async readDirectory<T>(relative: string, schema: ZodType<T>): Promise<T[]> {
    const directory = join(this.dataDir, relative);
    const names = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort();
    return Promise.all(names.map((name) => this.readJson(join(relative, name), schema)));
  }

  private async readJson<T>(relative: string, schema: ZodType<T>): Promise<T> {
    try {
      const raw = await readFile(join(this.dataDir, relative), 'utf8');
      return schema.parse(JSON.parse(raw));
    } catch (error) {
      if (error instanceof TaskdroidError) throw error;
      throw new TaskdroidError('INVALID_DATA', `Cannot read ${relative}`, error instanceof Error ? error.message : error);
    }
  }

  private async writeJson(relative: string, value: unknown): Promise<void> {
    const target = join(this.dataDir, relative);
    const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
    await mkdir(dirname(target), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporary, target);
  }
}

function safeId(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new TaskdroidError('INVALID_ID', 'Invalid record ID');
  return id;
}
function safeDocumentName(name: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.md$/.test(name)) throw new TaskdroidError('INVALID_INPUT', 'Document names must be safe .md filenames');
  return name;
}
