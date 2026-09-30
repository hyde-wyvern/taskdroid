import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import { Board } from "./Board";
import { Documentation } from "./Documentation";
import { ListView } from "./ListView";
import { PlanEditor } from "./PlanEditor";
import { ProjectView } from "./ProjectView";
import { Settings } from "./Settings";
import { TaskEditor } from "./TaskEditor";
import { WorkFilters, type WorkFilterValues } from "./WorkFilters";
import { fuzzyMatch } from "./fuzzySearch";
import { ToastProvider, useToast } from "./Toasts";
import { sortByWorkPriority } from "./sortNewest";
import { IconX } from "@tabler/icons-react";
import { IconAction, TaskButton } from "./Controls";
import type { Plan, Progress, Project, Task, Workflow } from "./types";

export function App() {
  return (
    <ToastProvider>
      <TaskdroidApp />
    </ToastProvider>
  );
}

function TaskdroidApp() {
  const [project, setProject] = useState<Project>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<WorkFilterValues>({
    search: "",
    planStatusIds: null,
    taskStatusIds: null,
    subtaskStatusIds: null,
  });
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string>();
  const [view, setView] = useState<
    "board" | "list" | "plans" | "settings" | "documentation"
  >("board");
  const [editingPlan, setEditingPlan] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();

  const loadProject = useCallback(async () => {
    try {
      const [nextProject, loadedPlans] = await Promise.all([
        api.project(),
        api.plans(),
      ]);
      const archivedPlans = view === "plans" ? await api.plans(true) : [];
      const nextPlans =
        view === "plans"
          ? sortByWorkPriority(
              [
                ...loadedPlans.filter((plan) => !plan.archivedAt),
                ...archivedPlans.filter((plan) => plan.archivedAt),
              ],
              nextProject.workflow,
            )
          : sortByWorkPriority(
              loadedPlans.filter((plan) => !plan.archivedAt),
              nextProject.workflow,
            );
      setProject(nextProject);
      setPlans(nextPlans);
      setPlanId((current) =>
        nextPlans.some((plan) => plan.id === current) ? current : "",
      );
      setError("");
    } catch (cause) {
      setError(message(cause));
    }
  }, [view]);

  const loadTasks = useCallback(async () => {
    if (!shouldLoadTasks(view, planId)) {
      setTasks([]);
      return;
    }
    try {
      const loaded = await api.tasks(planId || undefined);
      const active = loaded.filter((task) => !task.archivedAt);
      setTasks(active);
      setSelectedTask((current) =>
        current
          ? (active.find((task) => task.id === current.id) ?? current)
          : current,
      );
      setError("");
    } catch (cause) {
      setError(message(cause));
    }
  }, [planId, view]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);
  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);
  const plan = plans.find((item) => item.id === planId);
  const filteredTasks = filterTasks(tasks, filters);
  const visiblePlans = plans.filter(
    (item) =>
      (!planId || item.id === planId) &&
      includesStatus(filters.planStatusIds, item.statusId),
  );
  const visibleTasks = filteredTasks.filter((task) =>
    visiblePlans.some((item) => item.id === task.planId),
  );
  const visibleProgress = calculateProgress(
    visibleTasks,
    project?.workflow,
    filters.subtaskStatusIds,
  );
  const dashboardPlans = plans.filter(
    (item) =>
      includesStatus(filters.planStatusIds, item.statusId) &&
      fuzzyMatch(filters.search.trim().toLowerCase(), [
        item.title,
        item.summary,
        item.sourcePlan,
      ]),
  );
  const dashboardProgress = aggregateProgress(dashboardPlans);

  const refresh = useCallback(async () => {
    await Promise.all([loadProject(), loadTasks()]);
  }, [loadProject, loadTasks]);
  useEffect(() => {
    const events = new EventSource("/api/events");
    events.addEventListener("refresh", () => {
      void refresh();
    });
    return () => events.close();
  }, [refresh]);
  function openTask(task: Task, subtaskId?: string) {
    setSelectedTask(task);
    setSelectedSubtaskId(subtaskId);
  }
  function closeTask() {
    setSelectedTask(undefined);
    setSelectedSubtaskId(undefined);
  }
  function openPlan(id: string) {
    closeTask();
    setPlanId(id);
    setEditingPlan(true);
  }
  function clearFilters() {
    setPlanId("");
    setFilters({
      search: "",
      planStatusIds: null,
      taskStatusIds: null,
      subtaskStatusIds: null,
    });
  }

  return (
    <div className="shell">
      <header>
        <div>
          <span className="logo">TD</span>
          <h1>{project?.name ?? "Taskdroid"}</h1>
        </div>
        <nav aria-label="Primary navigation">
          <TaskButton
            type="button"
            variant={view === "board" ? "primary" : "default"}
            className={view === "board" ? "active" : undefined}
            aria-pressed={view === "board"}
            onClick={() => setView("board")}
          >
            Board
          </TaskButton>
          <TaskButton
            type="button"
            variant={view === "list" ? "primary" : "default"}
            className={view === "list" ? "active" : undefined}
            aria-pressed={view === "list"}
            onClick={() => setView("list")}
          >
            List
          </TaskButton>
          <TaskButton
            type="button"
            variant={view === "plans" ? "primary" : "default"}
            className={view === "plans" ? "active" : undefined}
            aria-pressed={view === "plans"}
            onClick={() => setView("plans")}
          >
            Project
          </TaskButton>
          <TaskButton
            type="button"
            variant={view === "settings" ? "primary" : "default"}
            className={view === "settings" ? "active" : undefined}
            aria-pressed={view === "settings"}
            onClick={() => setView("settings")}
          >
            Settings
          </TaskButton>
          <TaskButton
            type="button"
            variant={view === "documentation" ? "primary" : "default"}
            className={view === "documentation" ? "active" : undefined}
            aria-pressed={view === "documentation"}
            onClick={() => setView("documentation")}
          >
            Documentation
          </TaskButton>
        </nav>
      </header>
      {error && (
        <div className="error" role="alert">
          {error}
          <IconAction
            label="Dismiss error"
            icon={<IconX size={16} />}
            onClick={() => setError("")}
          />
        </div>
      )}
      <main>
        {view === "documentation" ? (
          <Documentation />
        ) : view === "settings" && project ? (
          <Settings
            workflow={project.workflow}
            onSaved={loadProject}
            onError={(cause) => setError(message(cause))}
          />
        ) : view === "plans" && project ? (
          <>
            <WorkFilters
              plans={plans}
              planId=""
              workflow={project.workflow}
              progress={dashboardProgress}
              values={filters}
              onPlanChange={() => undefined}
              onChange={setFilters}
              onClear={clearFilters}
              projectOnly
            />
            <ProjectView
              project={project}
              plans={dashboardPlans}
              workflow={project.workflow}
              onSelect={(selected) => {
                setPlanId(selected.id);
                setEditingPlan(true);
              }}
              onCreate={() => {
                setPlanId("");
                setEditingPlan(true);
              }}
              onMove={async (selected, statusId) => {
                try {
                  await api.movePlan(selected, statusId);
                  await loadProject();
                  toast("Plan status updated");
                } catch (cause) {
                  setError(message(cause));
                }
              }}
              onSave={async (documents) => {
                await api.updateProjectDocuments(project, documents);
                await loadProject();
              }}
              onError={(cause) => setError(message(cause))}
            />
          </>
        ) : view === "list" && project ? (
          <>
            <WorkFilters
              plans={plans}
              planId={planId}
              workflow={project.workflow}
              progress={visibleProgress}
              values={filters}
              onPlanChange={setPlanId}
              onChange={setFilters}
              onClear={clearFilters}
            />
            <ListView
              plans={visiblePlans}
              tasks={visibleTasks}
              workflow={project.workflow}
              subtaskStatusIds={filters.subtaskStatusIds}
              onSelectPlan={(selected) => openPlan(selected.id)}
              onSelectTask={(task) => openTask(task)}
              onSelectSubtask={(task, subtaskId) => openTask(task, subtaskId)}
              onChanged={refresh}
              onError={(cause) => setError(message(cause))}
            />
          </>
        ) : (
          <>
            {view === "board" && project && (
              <WorkFilters
                plans={plans}
                planId={planId}
                workflow={project.workflow}
                progress={visibleProgress}
                values={filters}
                onPlanChange={setPlanId}
                onChange={setFilters}
                onClear={clearFilters}
              />
            )}
            {project && visiblePlans.length ? (
              <Board
                planId={planId || undefined}
                workflow={project.workflow}
                tasks={visibleTasks}
                onSelect={(task) => openTask(task)}
                onChanged={refresh}
                onError={(cause) => setError(message(cause))}
              />
            ) : (
              <Empty create={() => setEditingPlan(true)} />
            )}
          </>
        )}
      </main>
      {editingPlan && project && (
        <PlanEditor
          plan={plan}
          tasks={tasks}
          workflow={project.workflow}
          archived={Boolean(plan?.archivedAt)}
          onSelectTask={(task) => {
            setEditingPlan(false);
            openTask(task);
          }}
          onClose={() => setEditingPlan(false)}
          onSaved={refresh}
          onError={(cause) => setError(message(cause))}
        />
      )}
      {selectedTask && project && (
        <TaskEditor
          key={selectedTask.id}
          task={selectedTask}
          planKey={plans.find((item) => item.id === selectedTask.planId)?.key}
          initialSubtaskId={selectedSubtaskId}
          workflow={project.workflow}
          archived={false}
          onSelectPlan={() => openPlan(selectedTask.planId)}
          onClose={closeTask}
          onSaved={refresh}
          onError={(cause) => setError(message(cause))}
        />
      )}
    </div>
  );
}

function Empty({ create }: { create: () => void }) {
  return (
    <div className="empty">
      <h2>No plans yet</h2>
      <TaskButton variant="primary" onClick={create}>
        Create first plan
      </TaskButton>
    </div>
  );
}

function message(cause: unknown): string {
  if (cause instanceof ApiError && cause.code === "REVISION_CONFLICT")
    return `${cause.message}. Reloaded data may contain another edit.`;
  return cause instanceof Error ? cause.message : String(cause);
}

function includesStatus(statusIds: string[] | null, statusId: string) {
  return statusIds === null || statusIds.includes(statusId);
}

export function shouldLoadTasks(
  view: "board" | "list" | "plans" | "settings" | "documentation",
  planId: string,
) {
  return (
    view === "board" || view === "list" || (view === "plans" && Boolean(planId))
  );
}

function filterTasks(tasks: Task[], filters: WorkFilterValues): Task[] {
  const query = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    if (!includesStatus(filters.taskStatusIds, task.statusId)) return false;
    const workItems = [
      task,
      ...task.subtasks.filter((subtask) => !subtask.archivedAt),
    ];
    return workItems.some((item) =>
      fuzzyMatch(query, [item.title, item.description, item.plan]),
    );
  });
}

function calculateProgress(
  tasks: Task[],
  workflow?: Workflow,
  subtaskStatusIds: string[] | null = null,
): Progress {
  if (!workflow) return { completedEffort: 0, totalEffort: 0, percentage: 0 };
  const completedStatuses = new Set(
    workflow.statuses
      .filter((status) => status.completed || status.fixed === "closed")
      .map((status) => status.id),
  );
  let totalEffort = 0;
  let completedEffort = 0;
  for (const task of tasks) {
    const subtasks = task.subtasks.filter(
      (subtask) =>
        !subtask.archivedAt &&
        (subtaskStatusIds === null ||
          subtaskStatusIds.includes(subtask.statusId)),
    );
    const leaves: Array<{ effort: number; statusId: string }> =
      task.subtasks.some((subtask) => !subtask.archivedAt) ? subtasks : [task];
    for (const item of leaves) {
      totalEffort += item.effort;
      if (completedStatuses.has(item.statusId)) completedEffort += item.effort;
    }
  }
  return {
    completedEffort,
    totalEffort,
    percentage: totalEffort
      ? Math.round((completedEffort / totalEffort) * 100)
      : 0,
  };
}

function aggregateProgress(plans: Plan[]): Progress {
  const completedEffort = plans.reduce(
    (sum, plan) => sum + plan.progress.completedEffort,
    0,
  );
  const totalEffort = plans.reduce(
    (sum, plan) => sum + plan.progress.totalEffort,
    0,
  );
  return {
    completedEffort,
    totalEffort,
    percentage: totalEffort
      ? Math.round((completedEffort / totalEffort) * 100)
      : 0,
  };
}
