import { useState } from "react";
import { TextInput } from "@mantine/core";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
import { api } from "./api";
import { EffortSelect } from "./EffortSelect";
import { IssueKey } from "./IssueKey";
import { IconAction, TaskButton } from "./Controls";
import { useToast } from "./Toasts";
import { StatusSelect } from "./StatusSelect";
import { isClosed } from "./isClosed";
import { sortByWorkPriority } from "./sortNewest";
import type { Plan, Task, Workflow } from "./types";

export function ListView({
  plans,
  tasks,
  workflow,
  subtaskStatusIds = null,
  onSelectPlan,
  onSelectTask,
  onSelectSubtask,
  onChanged,
  onError,
}: {
  plans: Plan[];
  tasks: Task[];
  workflow: Workflow;
  subtaskStatusIds?: string[] | null;
  onSelectPlan: (plan: Plan) => void;
  onSelectTask: (task: Task) => void;
  onSelectSubtask: (task: Task, subtaskId: string) => void;
  onChanged: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [creatingFor, setCreatingFor] = useState<string>();
  const [creatingSubtaskFor, setCreatingSubtaskFor] = useState<string>();
  const [expanded, setExpanded] = useState<string[]>([]);
  const [collapsedPlans, setCollapsedPlans] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [effort, setEffort] = useState(1);
  const toast = useToast();

  async function mutate(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      await onChanged();
      toast(success);
    } catch (error) {
      onError(error);
    }
  }
  async function createTask(planId: string) {
    if (!title.trim()) return;
    await mutate(
      () =>
        api.createTask(planId, {
          title: title.trim(),
          effort,
          statusId: "backlog",
        }),
      "Task created",
    );
    setTitle("");
    setEffort(1);
    setCreatingFor(undefined);
  }
  async function createSubtask(task: Task) {
    if (!title.trim()) return;
    await mutate(
      () => api.createSubtask(task, { title: title.trim(), effort }),
      "Subtask created",
    );
    setTitle("");
    setEffort(1);
    setCreatingSubtaskFor(undefined);
  }
  function beginTask(planId: string) {
    setCreatingSubtaskFor(undefined);
    setCreatingFor(planId);
    setTitle("");
    setEffort(1);
  }
  function beginSubtask(taskId: string) {
    setCreatingFor(undefined);
    setCreatingSubtaskFor(taskId);
    setExpanded((current) =>
      current.includes(taskId) ? current : current.concat(taskId),
    );
    setTitle("");
    setEffort(1);
  }
  function toggle(taskId: string) {
    setExpanded((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : current.concat(taskId),
    );
  }
  function togglePlan(planId: string) {
    setCollapsedPlans((current) =>
      current.includes(planId)
        ? current.filter((id) => id !== planId)
        : current.concat(planId),
    );
  }

  return (
    <section className="backlog-view">
      <div className="backlog-plans">
        {sortByWorkPriority(plans, workflow).map((plan) => {
          const planTasks = sortByWorkPriority(
            tasks.filter((task) => task.planId === plan.id),
            workflow,
          );
          const isCollapsed = collapsedPlans.includes(plan.id);
          const totalSubtasks = planTasks.reduce(
            (sum, task) =>
              sum +
              task.subtasks.filter((subtask) => !subtask.archivedAt).length,
            0,
          );
          const totalEffort = planTasks.reduce(
            (sum, task) => sum + task.effort,
            0,
          );
          return (
            <article className="backlog-plan" key={plan.id}>
              <header>
                <div>
                  <IconAction
                    label={`${isCollapsed ? "Expand" : "Collapse"} ${plan.title} plan`}
                    icon={
                      isCollapsed ? (
                        <IconChevronRight size={16} />
                      ) : (
                        <IconChevronDown size={16} />
                      )
                    }
                    onClick={() => togglePlan(plan.id)}
                  />
                  <h3>
                    <TaskButton
                      className={`plan-link${isClosed(workflow, plan.statusId) ? " closed-title" : ""}`}
                      onClick={() => onSelectPlan(plan)}
                    >
                      <IssueKey value={plan.key} kind="plan" />
                      {plan.title}
                    </TaskButton>
                  </h3>
                </div>
                <span>{totalSubtasks} subtasks</span>
                <span>{totalEffort} points</span>
                <StatusSelect
                  compact
                  statuses={workflow.statuses}
                  value={plan.statusId}
                  onChange={(statusId) =>
                    void mutate(
                      () => api.movePlan(plan, statusId),
                      "Plan status updated",
                    )
                  }
                  label={`${plan.title} status`}
                />
              </header>
              {!isCollapsed && (
                <div className="backlog-tasks">
                  {planTasks.map((task) => {
                    const subtasks = sortByWorkPriority(
                      task.subtasks.filter(
                        (subtask) =>
                          !subtask.archivedAt &&
                          (subtaskStatusIds === null ||
                            subtaskStatusIds.includes(subtask.statusId)),
                      ),
                      workflow,
                    );
                    const isExpanded = expanded.includes(task.id);
                    return (
                      <div className="backlog-task" key={task.id}>
                        <div className="backlog-task-row">
                          <IconAction
                            label={`${isExpanded ? "Collapse" : "Expand"} ${task.title} subtasks`}
                            icon={
                              isExpanded ? (
                                <IconChevronDown size={16} />
                              ) : (
                                <IconChevronRight size={16} />
                              )
                            }
                            onClick={() => toggle(task.id)}
                          />
                          <TaskButton
                            className={`task-link${isClosed(workflow, task.statusId) ? " closed-title" : ""}`}
                            onClick={() => onSelectTask(task)}
                          >
                            <IssueKey value={task.key} kind="task" />
                            {task.title}
                          </TaskButton>
                          <span>{subtasks.length} subtasks</span>
                          <span>{task.effort} points</span>
                          <StatusSelect
                            compact
                            statuses={workflow.statuses}
                            value={task.statusId}
                            onChange={(statusId) =>
                              void mutate(
                                () => api.move(task, statusId),
                                "Task status updated",
                              )
                            }
                            label={`${task.title} status`}
                          />
                        </div>
                        {isExpanded && (
                          <div className="backlog-subtasks">
                            {subtasks.map((subtask) => (
                              <div key={subtask.id}>
                                <TaskButton
                                  className={
                                    isClosed(workflow, subtask.statusId)
                                      ? "closed-title"
                                      : undefined
                                  }
                                  onClick={() =>
                                    onSelectSubtask(task, subtask.id)
                                  }
                                >
                                  <IssueKey
                                    value={subtask.key}
                                    kind="subtask"
                                  />
                                  {subtask.title}
                                </TaskButton>
                                <span aria-hidden="true" />
                                <span>{subtask.effort} points</span>
                                <StatusSelect
                                  compact
                                  statuses={workflow.statuses}
                                  value={subtask.statusId}
                                  onChange={(statusId) =>
                                    void mutate(
                                      () =>
                                        api.updateSubtask(task, subtask.id, {
                                          statusId,
                                        }),
                                      "Subtask status updated",
                                    )
                                  }
                                  label={`${subtask.title} status`}
                                />
                              </div>
                            ))}
                            {creatingSubtaskFor === task.id ? (
                              <div className="backlog-create subtask-create">
                                <TextInput
                                  autoFocus
                                  placeholder="Subtask title"
                                  aria-label="Subtask title"
                                  value={title}
                                  onChange={(event) =>
                                    setTitle(event.target.value)
                                  }
                                />
                                <EffortSelect
                                  label="Subtask effort points"
                                  value={effort}
                                  onChange={setEffort}
                                />
                                <TaskButton
                                  variant="primary"
                                  onClick={() => void createSubtask(task)}
                                >
                                  Add
                                </TaskButton>
                                <TaskButton
                                  onClick={() =>
                                    setCreatingSubtaskFor(undefined)
                                  }
                                >
                                  Cancel
                                </TaskButton>
                              </div>
                            ) : (
                              <TaskButton
                                className="new-row"
                                onClick={() => beginSubtask(task.id)}
                              >
                                + New subtask
                              </TaskButton>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!isCollapsed && !planTasks.length && (
                <p className="empty-plan">No tasks</p>
              )}
              {!isCollapsed &&
                (creatingFor === plan.id ? (
                  <div className="backlog-create">
                    <TextInput
                      autoFocus
                      placeholder="Task title"
                      aria-label="Task title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                    />
                    <EffortSelect
                      label="Task effort points"
                      value={effort}
                      onChange={setEffort}
                    />
                    <TaskButton
                      variant="primary"
                      onClick={() => void createTask(plan.id)}
                    >
                      Add
                    </TaskButton>
                    <TaskButton onClick={() => setCreatingFor(undefined)}>
                      Cancel
                    </TaskButton>
                  </div>
                ) : (
                  <TaskButton
                    className="new-row plan-new-row"
                    onClick={() => beginTask(plan.id)}
                  >
                    + New task
                  </TaskButton>
                ))}
            </article>
          );
        })}
      </div>
      {!plans.length && (
        <div className="empty compact">
          <h2>No plans yet</h2>
        </div>
      )}
    </section>
  );
}
