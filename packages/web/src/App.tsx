import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './api';
import { Board } from './Board';
import { Documentation } from './Documentation';
import { ListView } from './ListView';
import { PlanEditor } from './PlanEditor';
import { ProjectView } from './ProjectView';
import { Settings } from './Settings';
import { TaskEditor } from './TaskEditor';
import { WorkFilters, type WorkFilterValues } from './WorkFilters';
import { fuzzyMatch } from './fuzzySearch';
import { ToastProvider, useToast } from './Toasts';
import { sortByWorkPriority } from './sortNewest';
import type { Plan, Progress, Project, Task, Workflow } from './types';

export function App() {
  return <ToastProvider><TaskdroidApp /></ToastProvider>;
}

function TaskdroidApp() {
  const [project, setProject] = useState<Project>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<WorkFilterValues>({ search: '', planStatusIds: null, taskStatusIds: null, subtaskStatusIds: null });
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string>();
  const [view, setView] = useState<'board' | 'list' | 'plans' | 'settings' | 'documentation'>('board');
  const [editingPlan, setEditingPlan] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const loadProject = useCallback(async () => {
    try {
      const [nextProject, loadedPlans] = await Promise.all([api.project(), api.plans()]);
      const archivedPlans = view === 'plans' ? await api.plans(true) : [];
      const nextPlans = view === 'plans'
        ? sortByWorkPriority([...loadedPlans.filter((plan) => !plan.archivedAt), ...archivedPlans.filter((plan) => plan.archivedAt)], nextProject.workflow)
        : sortByWorkPriority(loadedPlans.filter((plan) => !plan.archivedAt), nextProject.workflow);
      setProject(nextProject); setPlans(nextPlans);
      setPlanId((current) => nextPlans.some((plan) => plan.id === current) ? current : '');
      setError('');
    } catch (cause) { setError(message(cause)); }
  }, [view]);

  const loadTasks = useCallback(async () => {
    if (view !== 'list' && view !== 'board') { setTasks([]); return; }
    try {
      const loaded = await api.tasks(planId || undefined);
      setTasks(loaded.filter((task) => !task.archivedAt)); setError('');
    }
    catch (cause) { setError(message(cause)); }
  }, [planId, view]);

  useEffect(() => { void loadProject(); }, [loadProject]);
  useEffect(() => { void loadTasks(); }, [loadTasks]);
  const plan = plans.find((item) => item.id === planId);
  const filteredTasks = filterTasks(tasks, filters);
  const visiblePlans = plans.filter((item) => (!planId || item.id === planId) && includesStatus(filters.planStatusIds, item.statusId));
  const visibleTasks = filteredTasks.filter((task) => visiblePlans.some((item) => item.id === task.planId));
  const visibleProgress = calculateProgress(visibleTasks, project?.workflow, filters.subtaskStatusIds);
  const dashboardPlans = plans.filter((item) => includesStatus(filters.planStatusIds, item.statusId) && fuzzyMatch(filters.search.trim().toLowerCase(), [item.title, item.summary, item.sourcePlan]));
  const dashboardProgress = aggregateProgress(dashboardPlans);

  async function refresh() { await Promise.all([loadProject(), loadTasks()]); }
  function openTask(task: Task, subtaskId?: string) { setSelectedTask(task); setSelectedSubtaskId(subtaskId); }
  function closeTask() { setSelectedTask(undefined); setSelectedSubtaskId(undefined); }
  function openPlan(id: string) { closeTask(); setPlanId(id); setEditingPlan(true); }
  function clearFilters() { setPlanId(''); setFilters({ search: '', planStatusIds: null, taskStatusIds: null, subtaskStatusIds: null }); }

  return <div className="shell">
    <header>
      <div><span className="logo">TD</span><h1>{project?.name ?? 'Taskdroid'}</h1></div>
      <nav>
        <button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>Board</button>
        <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button>
        <button className={view === 'plans' ? 'active' : ''} onClick={() => setView('plans')}>Project</button>
        <button className={view === 'settings' ? 'active' : ''} onClick={() => setView('settings')}>Settings</button>
        <button className={view === 'documentation' ? 'active' : ''} onClick={() => setView('documentation')}>Documentation</button>
      </nav>
    </header>
    {error && <div className="error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}
    <main>
      {view === 'documentation' ? <Documentation /> : view === 'settings' && project ? <Settings workflow={project.workflow} onSaved={loadProject} onError={(cause) => setError(message(cause))} /> : view === 'plans' && project ? <><WorkFilters plans={plans} planId="" workflow={project.workflow} progress={dashboardProgress} values={filters} onPlanChange={() => undefined} onChange={setFilters} onClear={clearFilters} projectOnly /><ProjectView project={project} plans={dashboardPlans} workflow={project.workflow} onSelect={(selected) => { setPlanId(selected.id); setEditingPlan(true); }} onCreate={() => { setPlanId(''); setEditingPlan(true); }} onMove={async (selected, statusId) => { try { await api.movePlan(selected, statusId); await loadProject(); toast('Plan status updated'); } catch (cause) { setError(message(cause)); } }} onSave={async (documents) => { await api.updateProjectDocuments(project, documents); await loadProject(); }} onError={(cause) => setError(message(cause))} /></> : view === 'list' && project ? <>
        <WorkFilters plans={plans} planId={planId} workflow={project.workflow} progress={visibleProgress} values={filters} onPlanChange={setPlanId} onChange={setFilters} onClear={clearFilters} />
        <ListView plans={visiblePlans} tasks={visibleTasks} workflow={project.workflow} subtaskStatusIds={filters.subtaskStatusIds} onSelectPlan={(selected) => openPlan(selected.id)} onSelectTask={(task) => openTask(task)} onSelectSubtask={(task, subtaskId) => openTask(task, subtaskId)} onChanged={refresh} onError={(cause) => setError(message(cause))} />
      </> : <>
        {view === 'board' && project && <WorkFilters plans={plans} planId={planId} workflow={project.workflow} progress={visibleProgress} values={filters} onPlanChange={setPlanId} onChange={setFilters} onClear={clearFilters} />}
        {project && visiblePlans.length ? <Board planId={planId || undefined} workflow={project.workflow} tasks={visibleTasks} onSelect={(task) => openTask(task)} onChanged={refresh} onError={(cause) => setError(message(cause))} /> : <Empty create={() => setEditingPlan(true)} />}
      </>}
    </main>
    {editingPlan && project && <PlanEditor plan={plan} tasks={tasks} workflow={project.workflow} archived={Boolean(plan?.archivedAt)} onSelectTask={(task) => { setEditingPlan(false); openTask(task); }} onClose={() => setEditingPlan(false)} onSaved={refresh} onError={(cause) => setError(message(cause))} />}
    {selectedTask && project && <TaskEditor key={selectedTask.id} task={selectedTask} planKey={plans.find((item) => item.id === selectedTask.planId)?.key} initialSubtaskId={selectedSubtaskId} workflow={project.workflow} archived={false} onSelectPlan={() => openPlan(selectedTask.planId)} onClose={closeTask} onSaved={refresh} onError={(cause) => setError(message(cause))} />}
  </div>;
}

function Empty({ create }: { create: () => void }) {
  return <div className="empty"><h2>No plans yet</h2><button className="primary" onClick={create}>Create first plan</button></div>;
}

function message(cause: unknown): string {
  if (cause instanceof ApiError && cause.code === 'REVISION_CONFLICT') return `${cause.message}. Reloaded data may contain another edit.`;
  return cause instanceof Error ? cause.message : String(cause);
}

function includesStatus(statusIds: string[] | null, statusId: string) { return statusIds === null || statusIds.includes(statusId); }

function filterTasks(tasks: Task[], filters: WorkFilterValues): Task[] {
  const query = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    if (!includesStatus(filters.taskStatusIds, task.statusId)) return false;
    const workItems = [task, ...task.subtasks.filter((subtask) => !subtask.archivedAt)];
    return workItems.some((item) => fuzzyMatch(query, [item.title, item.description, item.plan]));
  });
}

function calculateProgress(tasks: Task[], workflow?: Workflow, subtaskStatusIds: string[] | null = null): Progress {
  if (!workflow) return { completedEffort: 0, totalEffort: 0, percentage: 0 };
  const completedStatuses = new Set(workflow.statuses.filter((status) => status.completed || status.fixed === 'closed').map((status) => status.id));
  let totalEffort = 0;
  let completedEffort = 0;
  for (const task of tasks) {
    const subtasks = task.subtasks.filter((subtask) => !subtask.archivedAt && (subtaskStatusIds === null || subtaskStatusIds.includes(subtask.statusId)));
    const leaves: Array<{ effort: number; statusId: string }> = task.subtasks.some((subtask) => !subtask.archivedAt) ? subtasks : [task];
    for (const item of leaves) {
      totalEffort += item.effort;
      if (completedStatuses.has(item.statusId)) completedEffort += item.effort;
    }
  }
  return { completedEffort, totalEffort, percentage: totalEffort ? Math.round((completedEffort / totalEffort) * 100) : 0 };
}

function aggregateProgress(plans: Plan[]): Progress {
  const completedEffort = plans.reduce((sum, plan) => sum + plan.progress.completedEffort, 0);
  const totalEffort = plans.reduce((sum, plan) => sum + plan.progress.totalEffort, 0);
  return { completedEffort, totalEffort, percentage: totalEffort ? Math.round((completedEffort / totalEffort) * 100) : 0 };
}
