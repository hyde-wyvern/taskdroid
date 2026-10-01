import { useCallback, useEffect, useState } from "react";
import {
  Burger,
  Menu,
  Switch,
  useComputedColorScheme,
  useMantineColorScheme,
} from "@mantine/core";
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
import {
  parseRoute,
  serializeRoute,
  type AppRoute,
  type AppView,
} from "./routes";
import { IconMoonStars, IconSun, IconX } from "@tabler/icons-react";
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
  const [route, setRoute] = useState(() => parseRoute(window.location.href));
  const view = route.view;
  const [project, setProject] = useState<Project>();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [planId, setPlanId] = useState(() =>
    route.detail?.kind === "plan" ? route.detail.id : "",
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [filters, setFilters] = useState<WorkFilterValues>({
    search: "",
    planStatusIds: null,
    taskStatusIds: null,
    subtaskStatusIds: null,
  });
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<string>();
  const [editingPlan, setEditingPlan] = useState(
    () => route.detail?.kind === "plan",
  );
  const [error, setError] = useState("");
  const [menuOpened, setMenuOpened] = useState(false);
  const computedColorScheme = useComputedColorScheme("light");
  const { setColorScheme } = useMantineColorScheme();
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
      setPlansLoaded(true);
      setPlanId((current) =>
        nextPlans.some((plan) => plan.id === current) ? current : "",
      );
      setError("");
    } catch (cause) {
      setPlansLoaded(true);
      setError(message(cause));
    }
  }, [view]);

  const loadTasks = useCallback(async () => {
    const hasTaskRoute =
      route.detail?.kind === "task" || route.detail?.kind === "subtask";
    if (!shouldLoadTasks(view, planId) && !hasTaskRoute) {
      setTasks([]);
      setTasksLoaded(true);
      return;
    }
    setTasksLoaded(false);
    try {
      const loaded = await api.tasks(
        hasTaskRoute ? undefined : planId || undefined,
      );
      const active = loaded.filter((task) => !task.archivedAt);
      setTasks(active);
      setTasksLoaded(true);
      setSelectedTask((current) =>
        current
          ? (active.find((task) => task.id === current.id) ?? current)
          : current,
      );
      setError("");
    } catch (cause) {
      setTasksLoaded(true);
      setError(message(cause));
    }
  }, [planId, route.detail, view]);

  useEffect(() => {
    void loadProject();
  }, [loadProject]);
  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);
  const updateRoute = useCallback((next: AppRoute, replace = false) => {
    const url = serializeRoute(next);
    const current = `${window.location.pathname}${window.location.search}`;
    if (url === current) return;
    if (replace) window.history.replaceState(null, "", url);
    else window.history.pushState(null, "", url);
    setRoute(parseRoute(url));
    if (next.detail?.kind === "task" || next.detail?.kind === "subtask") {
      setTasksLoaded(false);
    }
  }, []);
  useEffect(() => {
    const onPopState = () => {
      const next = parseRoute(window.location.href);
      if (next.view !== route.view) setPlansLoaded(false);
      setTasksLoaded(false);
      setRoute(next);
      if (next.detail?.kind === "plan") setPlanId(next.detail.id);
      else if (route.detail?.kind === "plan") setPlanId("");
      setEditingPlan(next.detail?.kind === "plan");
      setSelectedTask(undefined);
      setSelectedSubtaskId(undefined);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [route]);
  useEffect(() => {
    const canonical = serializeRoute(route);
    const current = `${window.location.pathname}${window.location.search}`;
    if (canonical !== current) updateRoute(route, true);
  }, [route, updateRoute]);
  useEffect(() => {
    if (view !== "plans" || !project || !plansLoaded) return;
    const firstDocument = Object.keys(project.documents)[0];
    if (
      route.documentName &&
      !Object.hasOwn(project.documents, route.documentName)
    ) {
      updateRoute({ ...route, documentName: firstDocument }, true);
    } else if (!route.documentName && firstDocument) {
      updateRoute({ ...route, documentName: firstDocument }, true);
    }
  }, [plansLoaded, project, route, updateRoute, view]);
  useEffect(() => {
    if (!project || !route.detail) return;
    if (route.detail.kind === "plan") {
      if (!plansLoaded) return;
      const planId = route.detail.id;
      const target = plans.find((item) => item.id === planId);
      if (!target) {
        setEditingPlan(false);
        setPlanId("");
        updateRoute({ ...route, detail: undefined }, true);
        return;
      }
      setPlanId(target.id);
      setSelectedTask(undefined);
      setSelectedSubtaskId(undefined);
      setEditingPlan(true);
      return;
    }
    if (!tasksLoaded) return;
    const detail = route.detail;
    const target = tasks.find((item) =>
      detail.kind === "task"
        ? item.id === detail.id
        : item.id === detail.taskId,
    );
    if (!target) {
      setSelectedTask(undefined);
      setSelectedSubtaskId(undefined);
      updateRoute({ ...route, detail: undefined }, true);
      return;
    }
    if (detail.kind === "subtask") {
      const subtask = target.subtasks.find(
        (item) => item.id === detail.id && !item.archivedAt,
      );
      if (!subtask) {
        setSelectedTask(undefined);
        setSelectedSubtaskId(undefined);
        updateRoute({ ...route, detail: undefined }, true);
        return;
      }
      setSelectedSubtaskId(subtask.id);
    } else {
      setSelectedSubtaskId(undefined);
    }
    setPlanId(target.planId);
    setSelectedTask(target);
    setEditingPlan(false);
  }, [plans, plansLoaded, project, route, tasks, tasksLoaded, updateRoute]);
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
  function navigateView(nextView: AppView) {
    setEditingPlan(false);
    setSelectedTask(undefined);
    setSelectedSubtaskId(undefined);
    if (nextView !== view) setPlansLoaded(false);
    updateRoute({
      view: nextView,
      ...(nextView === "plans" && view === "plans" && route.documentName
        ? { documentName: route.documentName }
        : {}),
    });
  }
  function openTask(task: Task, subtaskId?: string) {
    setSelectedTask(task);
    setSelectedSubtaskId(subtaskId);
    updateRoute({
      ...route,
      detail: subtaskId
        ? { kind: "subtask", taskId: task.id, id: subtaskId }
        : { kind: "task", id: task.id },
    });
  }
  function closeTask() {
    setSelectedTask(undefined);
    setSelectedSubtaskId(undefined);
    if (route.detail?.kind === "task" || route.detail?.kind === "subtask") {
      updateRoute({ ...route, detail: undefined });
    }
  }
  function openPlan(id: string) {
    setSelectedTask(undefined);
    setSelectedSubtaskId(undefined);
    setPlanId(id);
    setEditingPlan(true);
    updateRoute({ ...route, detail: { kind: "plan", id } });
  }
  function closePlan() {
    setEditingPlan(false);
    if (route.detail?.kind === "plan") {
      updateRoute({ ...route, detail: undefined });
    }
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
      <header className="app-header">
        <div>
          <span className="logo">TD</span>
          <h1>{project?.name ?? "Taskdroid"}</h1>
        </div>
        <nav className="primary-navigation" aria-label="Primary navigation">
          <TaskButton
            type="button"
            variant="default"
            className={view === "board" ? "active" : undefined}
            aria-pressed={view === "board"}
            onClick={() => navigateView("board")}
          >
            Board
          </TaskButton>
          <TaskButton
            type="button"
            variant="default"
            className={view === "list" ? "active" : undefined}
            aria-pressed={view === "list"}
            onClick={() => navigateView("list")}
          >
            List
          </TaskButton>
          <TaskButton
            type="button"
            variant="default"
            className={view === "plans" ? "active" : undefined}
            aria-pressed={view === "plans"}
            onClick={() => navigateView("plans")}
          >
            Project
          </TaskButton>
        </nav>
        <div className="app-header-actions">
          <Menu
            opened={menuOpened}
            onChange={setMenuOpened}
            position="bottom-end"
            transitionProps={{ duration: 0 }}
            withinPortal
          >
            <Menu.Target>
              <Burger
                opened={menuOpened}
                aria-label={menuOpened ? "Close menu" : "Open menu"}
                size="sm"
              />
            </Menu.Target>
            <Menu.Dropdown>
              <div className="header-menu-scheme">
                <Switch
                  checked={computedColorScheme === "dark"}
                  onChange={(event) =>
                    setColorScheme(
                      event.currentTarget.checked ? "dark" : "light",
                    )
                  }
                  aria-label="Dark mode"
                  thumbIcon={
                    computedColorScheme === "dark" ? (
                      <IconMoonStars size={12} />
                    ) : (
                      <IconSun size={12} />
                    )
                  }
                />
                <span>Dark mode</span>
              </div>
              <Menu.Divider />
              <Menu.Item
                aria-label="Settings"
                aria-current={view === "settings" ? "page" : undefined}
                onClick={() => navigateView("settings")}
              >
                Settings
              </Menu.Item>
              <Menu.Item
                aria-label="Documentation"
                aria-current={view === "documentation" ? "page" : undefined}
                onClick={() => navigateView("documentation")}
              >
                Documentation
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </div>
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
              activeDocumentName={route.documentName}
              onDocumentChange={(name) =>
                updateRoute({ ...route, documentName: name })
              }
              onSelect={(selected) => openPlan(selected.id)}
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
          onClose={closePlan}
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
          onSelectSubtask={(task, subtaskId) => openTask(task, subtaskId)}
          onReturnToTask={(task) => openTask(task)}
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
