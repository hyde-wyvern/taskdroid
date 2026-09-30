import { NumberInput, TextInput, Textarea } from "@mantine/core";
import { useState } from "react";
import type { Subtask, Task, Workflow } from "./types";

import { DetailHeader } from "./DetailHeader";
import { DialogShell, TaskButton } from "./Controls";
import { StatusSelect } from "./StatusSelect";
import { WorkItemViewer } from "./WorkItemViewer";
import { api } from "./api";
import { isClosed } from "./isClosed";
import { useToast } from "./Toasts";

export function SubtaskEditor({
  task,
  subtask: initial,
  planKey,
  workflow,
  archived,
  onSelectPlan,
  onSelectTask,
  onClose,
  onTaskChanged,
  onError,
}: {
  task: Task;
  subtask: Subtask;
  planKey?: string;
  workflow: Workflow;
  archived: boolean;
  onSelectPlan: () => void;
  onSelectTask: () => void;
  onClose: () => void;
  onTaskChanged: (task: Task) => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [subtask, setSubtask] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [plan, setPlan] = useState(initial.plan);
  const [effort, setEffort] = useState(initial.effort);
  const [statusId, setStatusId] = useState(initial.statusId);
  const toast = useToast();
  const completed = workflow.statuses.some(
    (status) =>
      status.id === subtask.statusId &&
      (status.completed || status.fixed === "closed"),
  );
  const completedEffort = completed ? subtask.effort : 0;
  const percentage = subtask.effort > 0 && completed ? 100 : 0;

  async function update(changes: object, success = "Subtask updated") {
    try {
      const nextTask = await api.updateSubtask(task, subtask.id, changes);
      const next = nextTask.subtasks.find((item) => item.id === subtask.id);
      if (next) {
        setSubtask(next);
        setEffort(next.effort);
      }
      await onTaskChanged(nextTask);
      toast(success);
    } catch (error) {
      onError(error);
    }
  }

  async function save() {
    try {
      const nextTask = await api.updateSubtask(task, subtask.id, {
        title,
        description,
        plan,
        effort,
        statusId,
      });
      const next = nextTask.subtasks.find((item) => item.id === subtask.id);
      if (next) {
        setSubtask(next);
        setEffort(next.effort);
      }
      await onTaskChanged(nextTask);
      toast("Subtask saved");
      onSelectTask();
    } catch (error) {
      onError(error);
    }
  }

  function cancel() {
    setTitle(subtask.title);
    setDescription(subtask.description);
    setPlan(subtask.plan);
    setEffort(subtask.effort);
    setStatusId(subtask.statusId);
    setEditing(false);
  }

  async function archive() {
    try {
      await onTaskChanged(await api.archiveSubtask(task, subtask.id));
      toast("Subtask archived");
      onSelectTask();
    } catch (error) {
      onError(error);
    }
  }

  if (!editing)
    return (
      <WorkItemViewer
        title={subtask.title}
        closed={isClosed(workflow, subtask.statusId)}
        crumbs={[
          { key: planKey, kind: "plan", onSelect: onSelectPlan },
          { key: task.key, kind: "task", onSelect: onSelectTask },
          { key: subtask.key, kind: "subtask" },
        ]}
        status={
          <>
            <label htmlFor="viewer-subtask-status">Status</label>
            <StatusSelect
              id="viewer-subtask-status"
              statuses={workflow.statuses}
              value={subtask.statusId}
              disabled={archived}
              onChange={(statusId) => void update({ statusId })}
              label="Subtask status"
            />
          </>
        }
        progress={{
          percentage,
          completedEffort,
          totalEffort: subtask.effort,
          label: "effort points",
          ariaLabel: "Subtask progress",
        }}
        description={{
          label: "Description",
          value: subtask.description,
          empty: "No description",
        }}
        plan={{
          label: "Detailed plan",
          value: subtask.plan,
          empty: "No detailed plan",
        }}
        onEdit={archived ? undefined : () => setEditing(true)}
        editLabel="Edit subtask"
        onClose={onClose}
      />
    );

  return (
    <DialogShell title="Edit subtask" onClose={onClose} wide>
      <DetailHeader
        title="Edit subtask"
        crumbs={[
          { key: planKey, kind: "plan", onSelect: onSelectPlan },
          { key: task.key, kind: "task", onSelect: onSelectTask },
          { key: subtask.key, kind: "subtask" },
        ]}
        onClose={onClose}
      />
      <>
        <div className="form-grid">
          <TextInput
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <div className="field">
            <label htmlFor="edit-subtask-status">Status</label>
            <StatusSelect
              id="edit-subtask-status"
              statuses={workflow.statuses}
              value={statusId}
              onChange={setStatusId}
              label="Subtask status"
            />
          </div>
        </div>
        <Textarea
          label="Description"
          rows={3}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Textarea
          label="Detailed plan (Markdown)"
          rows={7}
          value={plan}
          onChange={(event) => setPlan(event.target.value)}
        />
        <NumberInput
          label="Effort points"
          min={0}
          max={100}
          value={effort}
          onChange={(value) => setEffort(Number(value) || 0)}
        />
      </>
      <footer>
        <TaskButton variant="danger" onClick={() => void archive()}>
          Archive subtask
        </TaskButton>
        <span />
        <TaskButton onClick={cancel}>Cancel</TaskButton>
        <TaskButton
          variant="primary"
          disabled={!title.trim()}
          onClick={() => void save()}
        >
          Save
        </TaskButton>
      </footer>
    </DialogShell>
  );
}
