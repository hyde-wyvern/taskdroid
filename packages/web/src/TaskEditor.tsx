import type { Subtask, Task, Workflow } from "./types";
import { IconRestore, IconTrash } from "@tabler/icons-react";
import { sortByWorkPriority, sortNewest } from "./sortNewest";
import { NumberInput, TextInput, Textarea } from "@mantine/core";
import { useEffect, useState } from "react";

import { DetailHeader } from "./DetailHeader";
import { DialogShell, IconAction, TaskButton } from "./Controls";
import { EffortSelect } from "./EffortSelect";
import { IssueKey } from "./IssueKey";
import { StatusSelect } from "./StatusSelect";
import { SubtaskEditor } from "./SubtaskEditor";
import { WorkItemViewer } from "./WorkItemViewer";
import { api } from "./api";
import { isClosed } from "./isClosed";
import { useToast } from "./Toasts";

type NewSubtask = Pick<Subtask, "title" | "effort" | "statusId">;

export function TaskEditor({
  task: initial,
  planKey,
  initialSubtaskId,
  workflow,
  archived,
  onSelectPlan,
  onClose,
  onSaved,
  onError,
}: {
  task: Task;
  planKey?: string;
  initialSubtaskId?: string;
  workflow: Workflow;
  archived: boolean;
  onSelectPlan: () => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState(initial);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [plan, setPlan] = useState(task.plan);
  const [effort, setEffort] = useState(task.effort);
  const [statusId, setStatusId] = useState(task.statusId);
  const [draftSubtasks, setDraftSubtasks] = useState<Subtask[]>(
    task.subtasks.filter((item) => !item.archivedAt),
  );
  const [newSubtasks, setNewSubtasks] = useState<NewSubtask[]>([]);
  const [selectedSubtaskId, setSelectedSubtaskId] = useState<
    string | undefined
  >(initialSubtaskId);
  const toast = useToast();
  useEffect(() => {
    if (!editing) setTask(initial);
  }, [editing, initial]);
  const activeSubtasks = sortByWorkPriority(
    task.subtasks.filter((item) => !item.archivedAt),
    workflow,
  );
  const archivedSubtasks = sortNewest(
    task.subtasks.filter((item) => item.archivedAt),
  );
  const progress = taskProgress(task, workflow);

  async function run(action: () => Promise<Task>, success = "Task updated") {
    try {
      const next = await action();
      setTask(next);
      setEffort(next.effort);
      await onSaved();
      toast(success);
    } catch (error) {
      onError(error);
    }
  }
  function startEditing() {
    setTitle(task.title);
    setDescription(task.description);
    setPlan(task.plan);
    setEffort(task.effort);
    setStatusId(task.statusId);
    setDraftSubtasks(activeSubtasks);
    setNewSubtasks([]);
    setEditing(true);
  }
  function updateDraftSubtask(id: string, changes: Partial<Subtask>) {
    setDraftSubtasks((items) =>
      items.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    );
  }
  function addSubtask() {
    setNewSubtasks((items) => [
      ...items,
      { title: "", effort: 1, statusId: "backlog" },
    ]);
  }
  function updateNewSubtask(index: number, changes: Partial<NewSubtask>) {
    setNewSubtasks((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    );
  }
  async function save() {
    try {
      let next = await api.updateTask(task, {
        title,
        description,
        plan,
        statusId,
        ...(activeSubtasks.length ? {} : { effort }),
      });
      for (const draft of draftSubtasks) {
        const original = task.subtasks.find((item) => item.id === draft.id);
        if (
          !original ||
          (original.title === draft.title &&
            original.effort === draft.effort &&
            original.statusId === draft.statusId)
        )
          continue;
        next = await api.updateSubtask(next, draft.id, {
          title: draft.title,
          effort: draft.effort,
          statusId: draft.statusId,
        });
      }
      for (const draft of newSubtasks.filter((item) => item.title.trim()))
        next = await api.createSubtask(next, {
          ...draft,
          title: draft.title.trim(),
        });
      setTask(next);
      setEffort(next.effort);
      await onSaved();
      toast("Task saved");
      setEditing(false);
    } catch (error) {
      onError(error);
    }
  }
  async function archiveSubtask(subtask: Subtask) {
    try {
      const next = await api.archiveSubtask(task, subtask.id);
      setTask(next);
      setDraftSubtasks(next.subtasks.filter((item) => !item.archivedAt));
      setEffort(next.effort);
      await onSaved();
      toast("Subtask archived");
    } catch (error) {
      onError(error);
    }
  }

  const selectedSubtask = task.subtasks.find(
    (subtask) => subtask.id === selectedSubtaskId,
  );
  async function acceptTask(next: Task) {
    setTask(next);
    setEffort(next.effort);
    await onSaved();
  }

  if (selectedSubtask)
    return (
      <SubtaskEditor
        task={task}
        subtask={selectedSubtask}
        planKey={planKey}
        workflow={workflow}
        archived={archived}
        onSelectPlan={onSelectPlan}
        onSelectTask={() => setSelectedSubtaskId(undefined)}
        onClose={onClose}
        onTaskChanged={acceptTask}
        onError={onError}
      />
    );
  if (!editing)
    return (
      <WorkItemViewer
        title={task.title}
        closed={isClosed(workflow, task.statusId)}
        crumbs={[
          { key: planKey, kind: "plan", onSelect: onSelectPlan },
          { key: task.key, kind: "task" },
        ]}
        status={
          <>
            <label htmlFor="viewer-task-status">Status</label>
            <StatusSelect
              id="viewer-task-status"
              statuses={workflow.statuses}
              value={task.statusId}
              disabled={archived}
              onChange={(statusId) => void run(() => api.move(task, statusId))}
              label="Task status"
            />
          </>
        }
        progress={{
          ...progress,
          label: "effort points",
          ariaLabel: "Task progress",
        }}
        description={{
          label: "Description",
          value: task.description,
          empty: "No description",
        }}
        plan={{
          label: "Detailed plan",
          value: task.plan,
          empty: "No detailed plan",
        }}
        childSection={{
          label: "Subtasks",
          content: activeSubtasks.length ? (
            <div className="viewer-subtasks">
              {activeSubtasks.map((subtask) => (
                <div key={subtask.id}>
                  <button
                    className={`subtask-link${isClosed(workflow, subtask.statusId) ? " closed-title" : ""}`}
                    onClick={() => setSelectedSubtaskId(subtask.id)}
                  >
                    <IssueKey value={subtask.key} kind="subtask" />
                    {subtask.title}
                  </button>
                  <span>{subtask.effort} pts</span>
                  <StatusSelect
                    compact
                    statuses={workflow.statuses}
                    value={subtask.statusId}
                    disabled={archived}
                    onChange={(statusId) =>
                      void run(() =>
                        api.updateSubtask(task, subtask.id, { statusId }),
                      )
                    }
                    label={`${subtask.title} status`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <p>No subtasks</p>
          ),
        }}
        leadingAction={
          archived ? (
            <IconAction
              label="Restore task"
              icon={<IconRestore size={18} />}
              onClick={() =>
                void run(() => api.restoreTask(task), "Task restored")
              }
            />
          ) : undefined
        }
        onEdit={archived ? undefined : startEditing}
        onClose={onClose}
      />
    );

  return (
    <DialogShell title="Edit task" onClose={onClose} wide>
      <DetailHeader
        title="Edit task"
        crumbs={[
          { key: planKey, kind: "plan", onSelect: onSelectPlan },
          { key: task.key, kind: "task" },
        ]}
        onClose={onClose}
      />
      <>
        <div className="form-grid">
          <TextInput
            label="Title"
            value={title}
            disabled={archived}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="field">
            <label htmlFor="edit-task-status">Status</label>
            <StatusSelect
              id="edit-task-status"
              statuses={workflow.statuses}
              value={statusId}
              disabled={archived}
              onChange={setStatusId}
              label="Task status"
            />
          </div>
        </div>
        <Textarea
          label="Description"
          rows={3}
          disabled={archived}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Textarea
          label="Detailed plan (Markdown)"
          rows={7}
          disabled={archived}
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
        />
        <NumberInput
          label="Effort points"
          min={0}
          max={100}
          disabled={archived || activeSubtasks.length > 0}
          value={effort}
          onChange={(value) => setEffort(Number(value) || 0)}
        />
        <h3>
          Subtasks <small>{task.effort} total points</small>
        </h3>
        <div className="subtasks">
          {sortByWorkPriority(draftSubtasks, workflow).map((subtask) => (
            <div className="subtask" key={subtask.id}>
              <TextInput
                aria-label={`${subtask.title} title`}
                value={subtask.title}
                onChange={(event) =>
                  updateDraftSubtask(subtask.id, { title: event.target.value })
                }
              />
              <NumberInput
                aria-label={`${subtask.title} effort`}
                min={0}
                max={100}
                value={subtask.effort}
                onChange={(value) =>
                  updateDraftSubtask(subtask.id, {
                    effort: Number(value) || 0,
                  })
                }
              />
              <StatusSelect
                compact
                statuses={workflow.statuses}
                value={subtask.statusId}
                onChange={(nextStatusId) =>
                  updateDraftSubtask(subtask.id, { statusId: nextStatusId })
                }
                label={`${subtask.title} status`}
              />
              <IconAction
                label={`Archive ${subtask.title}`}
                icon={<IconTrash size={18} />}
                danger
                onClick={() => void archiveSubtask(subtask)}
              />
            </div>
          ))}
          {newSubtasks.map((subtask, index) => (
            <div className="subtask" key={index}>
              <TextInput
                placeholder="New subtask"
                aria-label="New subtask title"
                value={subtask.title}
                onChange={(event) =>
                  updateNewSubtask(index, { title: event.target.value })
                }
              />
              <EffortSelect
                label="New subtask effort points"
                value={subtask.effort}
                onChange={(nextEffort) =>
                  updateNewSubtask(index, { effort: nextEffort })
                }
              />
              <StatusSelect
                compact
                statuses={workflow.statuses}
                value={subtask.statusId}
                onChange={(nextStatusId) =>
                  updateNewSubtask(index, { statusId: nextStatusId })
                }
                label="New subtask status"
              />
              <TaskButton
                variant="danger"
                className="danger-link"
                onClick={() =>
                  setNewSubtasks((items) =>
                    items.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Remove
              </TaskButton>
            </div>
          ))}
          {!archived && (
            <TaskButton className="add-row" onClick={addSubtask}>
              + New subtask
            </TaskButton>
          )}
          {archivedSubtasks.map((subtask) => (
            <div className="subtask muted" key={subtask.id}>
              <span>{subtask.title}</span>
              <span>{subtask.effort} pts</span>
              <span>Archived</span>
              <IconAction
                label={`Restore ${subtask.title}`}
                icon={<IconRestore size={18} />}
                onClick={() =>
                  void run(() => api.restoreSubtask(task, subtask.id))
                }
              />
            </div>
          ))}
        </div>
      </>
      <footer>
        <TaskButton
          variant="danger"
          leftSection={<IconTrash size={18} />}
          onClick={() => void run(() => api.archiveTask(task), "Task archived")}
        >
          Archive task
        </TaskButton>
        <span />
        <TaskButton onClick={() => setEditing(false)}>Cancel</TaskButton>
        <TaskButton variant="primary" onClick={() => void save()}>
          Save
        </TaskButton>
      </footer>
    </DialogShell>
  );
}

function taskProgress(task: Task, workflow: Workflow) {
  const activeSubtasks = task.subtasks.filter((subtask) => !subtask.archivedAt);
  const leaves = activeSubtasks.length ? activeSubtasks : [task];
  const completedStatuses = new Set(
    workflow.statuses
      .filter((status) => status.completed || status.fixed === "closed")
      .map((status) => status.id),
  );
  const totalEffort = leaves.reduce((sum, item) => sum + item.effort, 0);
  const completedEffort = leaves.reduce(
    (sum, item) =>
      sum + (completedStatuses.has(item.statusId) ? item.effort : 0),
    0,
  );
  return {
    totalEffort,
    completedEffort,
    percentage: totalEffort
      ? Math.round((completedEffort / totalEffort) * 100)
      : 0,
  };
}
