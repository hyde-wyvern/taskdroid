import type { Plan, Task, Workflow } from "./types";
import { IconRestore, IconTrash } from "@tabler/icons-react";
import { sortByWorkPriority, sortNewest } from "./sortNewest";
import { NumberInput, TextInput, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";

import { DetailHeader } from "./DetailHeader";
import { DialogShell, IconAction, TaskButton } from "./Controls";
import { EffortSelect } from "./EffortSelect";
import { IssueKey } from "./IssueKey";
import { StatusSelect } from "./StatusSelect";
import { MarkdownEditor } from "./MarkdownEditor";
import { WorkItemViewer } from "./WorkItemViewer";
import { api } from "./api";
import { isClosed } from "./isClosed";
import { useToast } from "./Toasts";

export function PlanEditor({
  plan: initial,
  tasks = [],
  workflow,
  archived,
  onSelectTask,
  onClose,
  onSaved,
  onError,
}: {
  plan?: Plan;
  tasks?: Task[];
  workflow: Workflow;
  archived: boolean;
  onSelectTask?: (task: Task) => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [plan, setPlan] = useState(initial);
  const [editing, setEditing] = useState(!plan);
  const [title, setTitle] = useState(plan?.title ?? "");
  const [summary, setSummary] = useState(plan?.summary ?? "");
  const [sourcePlan, setSourcePlan] = useState(plan?.sourcePlan ?? "");
  const [statusId, setStatusId] = useState(plan?.statusId ?? "backlog");
  const [draftTasks, setDraftTasks] = useState<Task[]>([]);
  const [newTasks, setNewTasks] = useState<
    Array<{ title: string; effort: number; statusId: string }>
  >([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const toast = useToast();
  useEffect(() => {
    if (!editing) setPlan(initial);
  }, [editing, initial]);
  useEffect(() => {
    if (!editing || !plan || archived) {
      setArchivedTasks([]);
      return;
    }
    let current = true;
    void api
      .tasks(plan.id, true)
      .then((items) => {
        if (current)
          setArchivedTasks(sortNewest(items.filter((item) => item.archivedAt)));
      })
      .catch(onError);
    return () => {
      current = false;
    };
  }, [archived, editing, plan?.id, onError]);
  async function toggleArchive() {
    if (!plan) return;
    try {
      if (archived) await api.restorePlan(plan);
      else await api.archivePlan(plan);
      await onSaved();
      toast(archived ? "Plan restored" : "Plan archived");
      onClose();
    } catch (error) {
      onError(error);
    }
  }
  async function moveStatus(statusId: string) {
    if (!plan) return;
    try {
      const next = await api.movePlan(plan, statusId);
      setPlan({ ...plan, ...next });
      await onSaved();
      toast("Plan status updated");
    } catch (error) {
      onError(error);
    }
  }
  async function moveTask(task: Task, statusId: string) {
    try {
      await api.move(task, statusId);
      await onSaved();
      toast("Task status updated");
    } catch (error) {
      onError(error);
    }
  }
  function startEditing() {
    if (!plan) return;
    setTitle(plan.title);
    setSummary(plan.summary);
    setSourcePlan(plan.sourcePlan);
    setStatusId(plan.statusId);
    setDraftTasks(childTasks);
    setNewTasks([]);
    setEditing(true);
  }
  function updateDraftTask(id: string, changes: Partial<Task>) {
    setDraftTasks((items) =>
      items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }
  function addTask() {
    setNewTasks((items) => [
      ...items,
      { title: "", effort: 1, statusId: "backlog" },
    ]);
  }
  function updateNewTask(
    index: number,
    changes: Partial<{ title: string; effort: number; statusId: string }>,
  ) {
    setNewTasks((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  }
  async function save() {
    try {
      if (!plan) {
        await api.createPlan({ title, summary, sourcePlan });
        await onSaved();
        toast("Plan created");
        onClose();
        return;
      }
      const nextPlan = await api.updatePlan(plan.id, plan.revision, {
        title,
        summary,
        sourcePlan,
        statusId,
      });
      for (const draft of draftTasks) {
        const original = childTasks.find((item) => item.id === draft.id);
        if (
          !original ||
          (original.title === draft.title &&
            original.effort === draft.effort &&
            original.statusId === draft.statusId)
        )
          continue;
        await api.updateTask(original, {
          title: draft.title,
          effort: draft.effort,
          statusId: draft.statusId,
        });
      }
      for (const draft of newTasks.filter((item) => item.title.trim()))
        await api.createTask(nextPlan.id, {
          ...draft,
          title: draft.title.trim(),
        });
      setPlan(nextPlan);
      await onSaved();
      toast("Plan saved");
      setEditing(false);
    } catch (error) {
      onError(error);
    }
  }
  async function archiveTask(task: Task) {
    try {
      const next = await api.archiveTask(task);
      setDraftTasks((items) => items.filter((item) => item.id !== task.id));
      setArchivedTasks((items) => [...items, next]);
      await onSaved();
      toast("Task archived");
    } catch (error) {
      onError(error);
    }
  }
  async function restoreTask(task: Task) {
    try {
      const next = await api.restoreTask(task);
      setArchivedTasks((items) => items.filter((item) => item.id !== task.id));
      setDraftTasks((items) => [...items, next]);
      await onSaved();
      toast("Task restored");
    } catch (error) {
      onError(error);
    }
  }
  const childTasks = archived
    ? sortNewest(
        tasks.filter(
          (task) => task.planId === plan?.id && Boolean(task.archivedAt),
        ),
      )
    : sortByWorkPriority(
        tasks.filter((task) => task.planId === plan?.id && !task.archivedAt),
        workflow,
      );
  if (plan && !editing)
    return (
      <WorkItemViewer
        title={plan.title}
        closed={isClosed(workflow, plan.statusId)}
        crumbs={[{ key: plan.key, kind: "plan" }]}
        status={
          <>
            <label htmlFor="viewer-plan-status">Status</label>
            <StatusSelect
              id="viewer-plan-status"
              statuses={workflow.statuses}
              value={plan.statusId}
              disabled={archived}
              onChange={(statusId) => void moveStatus(statusId)}
              label="Plan status"
            />
          </>
        }
        progress={{
          ...plan.progress,
          label: "points",
          ariaLabel: "Plan progress",
        }}
        description={{
          label: "Summary",
          value: plan.summary,
          empty: "No summary",
        }}
        plan={{
          label: "Source plan",
          value: plan.sourcePlan,
          empty: "No source plan",
        }}
        childSection={{
          label: "Tasks",
          content: childTasks.length ? (
            <div className="viewer-subtasks">
              {childTasks.map((task) => (
                <div key={task.id}>
                  <button
                    className={`subtask-link${isClosed(workflow, task.statusId) ? " closed-title" : ""}`}
                    onClick={() => onSelectTask?.(task)}
                  >
                    <IssueKey value={task.key} kind="task" />
                    {task.title}
                  </button>
                  <span>{task.effort} pts</span>
                  <StatusSelect
                    compact
                    statuses={workflow.statuses}
                    value={task.statusId}
                    disabled={archived}
                    onChange={(statusId) => void moveTask(task, statusId)}
                    label={`${task.title} status`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p>No tasks</p>
          ),
        }}
        leadingAction={
          archived ? (
            <IconAction
              label="Restore plan"
              icon={<IconRestore size={18} />}
              onClick={() => void toggleArchive()}
            />
          ) : undefined
        }
        onEdit={archived ? undefined : startEditing}
        onClose={onClose}
      />
    );
  return (
    <DialogShell title={plan ? "Edit plan" : "New plan"} onClose={onClose} wide>
      <DetailHeader
        title={plan ? "Edit plan" : "New plan"}
        crumbs={plan ? [{ key: plan.key, kind: "plan" }] : []}
        onClose={onClose}
      />
      <>
        <div className="form-grid">
          <TextInput
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          {plan && (
            <div className="field">
              <label htmlFor="edit-plan-status">Status</label>
              <StatusSelect
                id="edit-plan-status"
                statuses={workflow.statuses}
                value={statusId}
                onChange={setStatusId}
                label="Plan status"
              />
            </div>
          )}
        </div>
        <Textarea
          label="Summary"
          rows={3}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
        />
        <MarkdownEditor
          label="Source plan (Markdown)"
          value={sourcePlan}
          onChange={setSourcePlan}
          height={320}
        />
        {plan && (
          <>
            <h3>
              Tasks{" "}
              <small>
                {childTasks.reduce((total, task) => total + task.effort, 0)}{" "}
                total points
              </small>
            </h3>
            <div className="subtasks">
              {sortByWorkPriority(draftTasks, workflow).map((task) => (
                <div className="subtask" key={task.id}>
                  <TextInput
                    aria-label={`${task.title} title`}
                    value={task.title}
                    onChange={(event) =>
                      updateDraftTask(task.id, { title: event.target.value })
                    }
                  />
                  <NumberInput
                    aria-label={`${task.title} effort`}
                    min={0}
                    max={100}
                    value={task.effort}
                    onChange={(value) =>
                      updateDraftTask(task.id, {
                        effort: Number(value) || 0,
                      })
                    }
                  />
                  <StatusSelect
                    compact
                    statuses={workflow.statuses}
                    value={task.statusId}
                    onChange={(nextStatusId) =>
                      updateDraftTask(task.id, { statusId: nextStatusId })
                    }
                    label={`${task.title} status`}
                  />
                  <IconAction
                    label={`Archive ${task.title}`}
                    icon={<IconTrash size={18} />}
                    danger
                    onClick={() => void archiveTask(task)}
                  />
                </div>
              ))}
              {newTasks.map((task, index) => (
                <div className="subtask" key={index}>
                  <TextInput
                    placeholder="New task"
                    aria-label="New task title"
                    value={task.title}
                    onChange={(event) =>
                      updateNewTask(index, { title: event.target.value })
                    }
                  />
                  <EffortSelect
                    label="New task effort points"
                    value={task.effort}
                    onChange={(nextEffort) =>
                      updateNewTask(index, { effort: nextEffort })
                    }
                  />
                  <StatusSelect
                    compact
                    statuses={workflow.statuses}
                    value={task.statusId}
                    onChange={(nextStatusId) =>
                      updateNewTask(index, { statusId: nextStatusId })
                    }
                    label="New task status"
                  />
                  <TaskButton
                    variant="danger"
                    className="danger-link"
                    onClick={() =>
                      setNewTasks((items) =>
                        items.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    Remove
                  </TaskButton>
                </div>
              ))}
              <TaskButton className="add-row" onClick={addTask}>
                + New task
              </TaskButton>
              {archivedTasks.map((task) => (
                <div className="subtask muted" key={task.id}>
                  <span>{task.title}</span>
                  <span>{task.effort} pts</span>
                  <span>Archived</span>
                  <IconAction
                    label={`Restore ${task.title}`}
                    icon={<IconRestore size={18} />}
                    onClick={() => void restoreTask(task)}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </>
      <footer>
        {plan && (
          <TaskButton
            variant="danger"
            leftSection={<IconTrash size={18} />}
            onClick={() => void toggleArchive()}
          >
            Archive
          </TaskButton>
        )}
        <span />
        <TaskButton onClick={plan ? () => setEditing(false) : onClose}>
          {plan ? "Cancel" : "Close"}
        </TaskButton>
        {!archived && (
          <TaskButton
            variant="primary"
            disabled={!title.trim()}
            onClick={() => void save()}
          >
            Save
          </TaskButton>
        )}
      </footer>
    </DialogShell>
  );
}
