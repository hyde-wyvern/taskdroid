import type { Plan, Task, Workflow } from "./types";
import { afterEach, describe, expect, it, vi } from "vitest";
// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";

import { PlanEditor } from "./PlanEditor";
import { TaskEditor } from "./TaskEditor";
import { api } from "./api";
import { renderWithMantine } from "./testUtils";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const now = new Date().toISOString();
const workflow: Workflow = {
  schemaVersion: 1,
  revision: 1,
  updatedAt: now,
  startStatusId: "todo",
  statuses: [
    {
      id: "backlog",
      name: "Backlog",
      color: "#64748b",
      completed: false,
      fixed: "backlog",
    },
    { id: "todo", name: "Todo", color: "#3b82f6", completed: false },
    {
      id: "closed",
      name: "Closed",
      color: "#334155",
      completed: true,
      fixed: "closed",
    },
  ],
};
const plan: Plan = {
  id: "plan",
  revision: 1,
  title: "Viewer plan",
  summary: "Summary",
  sourcePlan: "# Plan",
  statusId: "todo",
  archivedAt: null,
  progress: { completedEffort: 3, totalEffort: 8, percentage: 38 },
};
const task: Task = {
  id: "task",
  key: "EP-2",
  planId: "plan",
  revision: 1,
  title: "Viewer task",
  description: "Description",
  plan: "Plan",
  statusId: "todo",
  effort: 8,
  archivedAt: null,
  subtasks: [
    {
      id: "one",
      taskId: "task",
      revision: 1,
      title: "Done work",
      description: "Subtask description",
      plan: "Subtask plan",
      statusId: "closed",
      effort: 3,
      archivedAt: null,
    },
    {
      id: "two",
      taskId: "task",
      revision: 1,
      title: "Remaining work",
      description: "",
      plan: "",
      statusId: "todo",
      effort: 5,
      archivedAt: null,
    },
  ],
};

describe("detail dialogs", () => {
  it("opens plan read-only and enables fields only after Edit", async () => {
    const onSelectTask = vi.fn();
    vi.spyOn(api, "tasks").mockResolvedValue([
      { ...task, id: "archived-task", title: "Archived task", archivedAt: now },
    ]);
    renderWithMantine(
      <PlanEditor
        plan={plan}
        tasks={[task]}
        workflow={workflow}
        archived={false}
        onSelectTask={onSelectTask}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Viewer plan" })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(1);
    expect(
      screen
        .getByRole("heading", { name: "Viewer plan" })
        .closest(".dialog")
        ?.classList.contains("wide"),
    ).toBe(true);
    expect(screen.queryByText("Plan details")).toBeNull();
    expect(screen.getByText("38% complete")).toBeTruthy();
    expect(screen.getByText("3/8 points")).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Plan status" }),
    ).toHaveProperty("value", "todo");
    expect(
      screen
        .getByRole("progressbar", { name: "Plan progress" })
        .getAttribute("aria-valuenow"),
    ).toBe("38");
    expect(screen.getByText("Tasks")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Viewer task" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Viewer task status" }),
    ).toHaveProperty("value", "todo");
    fireEvent.click(screen.getByRole("button", { name: "Viewer task" }));
    expect(onSelectTask).toHaveBeenCalledWith(task);
    expect(screen.queryByDisplayValue("Viewer plan")).toBeNull();
    const editPlan = screen.getByRole("button", { name: "Edit" });
    expect(editPlan.closest(".detail-key-row")).toBeTruthy();
    expect(editPlan.closest("footer")).toBeNull();
    fireEvent.mouseEnter(editPlan);
    await waitFor(() =>
      expect(screen.getByRole("tooltip", { name: "Edit" })).toBeTruthy(),
    );
    fireEvent.click(editPlan);
    expect(screen.getByDisplayValue("Viewer plan")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Edit plan" })).toBeTruthy();
    expect(screen.getByDisplayValue("Viewer task")).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Viewer task status" }),
    ).toHaveProperty("value", "todo");
    const archiveEmbeddedTask = screen.getByRole("button", {
      name: "Archive Viewer task",
    });
    expect(
      archiveEmbeddedTask.querySelector("svg")?.getAttribute("class"),
    ).toContain("tabler-icon-trash");
    fireEvent.mouseEnter(archiveEmbeddedTask);
    await waitFor(() =>
      expect(
        screen.getByRole("tooltip", { name: "Archive Viewer task" }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "+ New task" }));
    expect(screen.getByPlaceholderText("New task")).toBeTruthy();
    expect(
      Array.from(
        screen
          .getByRole("combobox", { name: "New task effort points" })
          .querySelectorAll("option"),
      ).map((option) => option.value),
    ).toEqual([
      "0",
      "1",
      "2",
      "3",
      "5",
      "8",
      "13",
      "21",
      "34",
      "55",
      "89",
      "100",
    ]);
    await waitFor(() => expect(screen.getByText("Archived task")).toBeTruthy());
    expect(
      screen.getByRole("button", { name: "Restore Archived task" }),
    ).toBeTruthy();
  });

  it("keeps plan and embedded task drafts local until Save", async () => {
    const updatePlan = vi
      .spyOn(api, "updatePlan")
      .mockResolvedValue({ ...plan, title: "Updated plan", revision: 2 });
    const updateTask = vi
      .spyOn(api, "updateTask")
      .mockResolvedValue({ ...task, title: "Updated task", revision: 2 });
    const createTask = vi
      .spyOn(api, "createTask")
      .mockResolvedValue({ ...task, id: "new-task", title: "Added task" });
    const onSaved = vi.fn().mockResolvedValue(undefined);
    renderWithMantine(
      <PlanEditor
        plan={plan}
        tasks={[task]}
        workflow={workflow}
        archived={false}
        onClose={vi.fn()}
        onSaved={onSaved}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Updated plan" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Summary" }), {
      target: { value: "Updated summary" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Source plan (Markdown)" }),
      { target: { value: "# Updated plan" } },
    );
    fireEvent.change(
      screen.getByRole("textbox", { name: "Viewer task title" }),
      { target: { value: "Updated task" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "+ New task" }));
    fireEvent.change(screen.getByRole("textbox", { name: "New task title" }), {
      target: { value: "Added task" },
    });

    expect(updatePlan).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updatePlan).toHaveBeenCalledWith(
        "plan",
        1,
        expect.objectContaining({
          title: "Updated plan",
          summary: "Updated summary",
          sourcePlan: "# Updated plan",
        }),
      ),
    );
    expect(updateTask).toHaveBeenCalledWith(
      task,
      expect.objectContaining({ title: "Updated task" }),
    );
    expect(createTask).toHaveBeenCalledWith(
      "plan",
      expect.objectContaining({ title: "Added task" }),
    );
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("discards plan and embedded task drafts on Cancel", () => {
    const updatePlan = vi.spyOn(api, "updatePlan");
    const updateTask = vi.spyOn(api, "updateTask");
    const createTask = vi.spyOn(api, "createTask");
    renderWithMantine(
      <PlanEditor
        plan={plan}
        tasks={[task]}
        workflow={workflow}
        archived={false}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Discarded plan" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Viewer task title" }),
      { target: { value: "Discarded task" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "+ New task" }));
    fireEvent.change(screen.getByRole("textbox", { name: "New task title" }), {
      target: { value: "Discarded new task" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updatePlan).not.toHaveBeenCalled();
    expect(updateTask).not.toHaveBeenCalled();
    expect(createTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveProperty(
      "value",
      "Viewer plan",
    );
    expect(
      screen.getByRole("textbox", { name: "Viewer task title" }),
    ).toHaveProperty("value", "Viewer task");
    expect(
      screen.queryByRole("textbox", { name: "New task title" }),
    ).toBeNull();
  });

  it("opens task read-only and enables fields only after Edit", () => {
    renderWithMantine(
      <TaskEditor
        task={task}
        planKey="EP-1"
        workflow={workflow}
        archived={false}
        onSelectPlan={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Viewer task" })).toBeTruthy();
    expect(screen.queryByText("Task details")).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Task status" }),
    ).toHaveProperty("value", "todo");
    expect(
      screen.getByRole("combobox", { name: "Done work status" }),
    ).toHaveProperty("value", "closed");
    expect(
      screen.getByRole("combobox", { name: "Remaining work status" }),
    ).toHaveProperty("value", "todo");
    expect(screen.getByText("38% complete")).toBeTruthy();
    expect(screen.getByText("3/8 effort points")).toBeTruthy();
    expect(
      screen
        .getByRole("progressbar", { name: "Task progress" })
        .getAttribute("aria-valuenow"),
    ).toBe("38");
    expect(screen.queryByDisplayValue("Viewer task")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByDisplayValue("Viewer task")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Edit task" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "+ New subtask" }));
    expect(
      Array.from(
        screen
          .getByRole("combobox", { name: "New subtask effort points" })
          .querySelectorAll("option"),
      ).map((option) => option.value),
    ).toEqual([
      "0",
      "1",
      "2",
      "3",
      "5",
      "8",
      "13",
      "21",
      "34",
      "55",
      "89",
      "100",
    ]);
  });

  it("opens subtask viewer and editor from task details", () => {
    const onSelectPlan = vi.fn();
    renderWithMantine(
      <TaskEditor
        task={{
          ...task,
          key: "EP-2",
          subtasks: task.subtasks.map((item, index) => ({
            ...item,
            key: `EP-${index + 3}`,
          })),
        }}
        planKey="EP-1"
        workflow={workflow}
        archived={false}
        onSelectPlan={onSelectPlan}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Done work" }));
    expect(screen.getByRole("heading", { name: "Done work" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Viewer task" })).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Open EP-1" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open EP-2" })).toBeTruthy();
    expect(
      screen
        .getByRole("heading", { name: "Done work" })
        .closest(".dialog")
        ?.classList.contains("wide"),
    ).toBe(true);
    expect(screen.getByText("Subtask description")).toBeTruthy();
    expect(screen.getByText("Subtask plan")).toBeTruthy();
    expect(screen.getByText("3/3 effort points")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit subtask" }));
    expect(screen.getByRole("heading", { name: "Edit subtask" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Archive subtask" }),
    ).toBeTruthy();
    expect(screen.getByDisplayValue("Subtask description")).toBeTruthy();
    expect(screen.getByDisplayValue("Subtask plan")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open EP-2" }));
    expect(screen.getByRole("heading", { name: "Viewer task" })).toBeTruthy();
  });

  it("discards subtask editor drafts on Cancel", async () => {
    const keyedTask = {
      ...task,
      key: "EP-2",
      subtasks: task.subtasks.map((item, index) => ({
        ...item,
        key: `EP-${index + 3}`,
      })),
    };
    const updateSubtask = vi.spyOn(api, "updateSubtask").mockResolvedValue({
      ...keyedTask,
      revision: 2,
      subtasks: [
        { ...keyedTask.subtasks[0], title: "Saved subtask" },
        keyedTask.subtasks[1],
      ],
    });
    renderWithMantine(
      <TaskEditor
        task={keyedTask}
        planKey="EP-1"
        workflow={workflow}
        archived={false}
        onSelectPlan={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Done work" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit subtask" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Discarded subtask" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Description" }), {
      target: { value: "Discarded description" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateSubtask).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Done work" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Edit subtask" }));
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveProperty(
      "value",
      "Done work",
    );
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveProperty(
      "value",
      "Subtask description",
    );
    expect(updateSubtask).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
      target: { value: "Saved subtask" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(updateSubtask).toHaveBeenCalledWith(
        keyedTask,
        "one",
        expect.objectContaining({ title: "Saved subtask" }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Viewer task" })).toBeTruthy(),
    );
  });

  it("keeps task edit changes local until Save, then returns to the viewer", async () => {
    const updateTask = vi
      .spyOn(api, "updateTask")
      .mockResolvedValue({ ...task, statusId: "closed", revision: 2 });
    renderWithMantine(
      <TaskEditor
        task={task}
        planKey="EP-1"
        workflow={workflow}
        archived={false}
        onSelectPlan={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Task status" }), {
      target: { value: "closed" },
    });
    expect(updateTask).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(updateTask).toHaveBeenCalledWith(
        task,
        expect.objectContaining({ statusId: "closed" }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Viewer task" })).toBeTruthy(),
    );
  });

  it("archives a plan through a named trash icon and keeps the existing callback", async () => {
    const archivePlan = vi.spyOn(api, "archivePlan").mockResolvedValue({
      ...plan,
      archivedAt: now,
    });
    const onClose = vi.fn();
    renderWithMantine(
      <PlanEditor
        plan={plan}
        tasks={[]}
        workflow={workflow}
        archived={false}
        onClose={onClose}
        onSaved={vi.fn().mockResolvedValue(undefined)}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    const archive = screen.getByRole("button", { name: "Archive" });
    expect(archive.querySelector("svg")?.getAttribute("class")).toContain(
      "tabler-icon-trash",
    );
    fireEvent.click(archive);

    await waitFor(() => expect(archivePlan).toHaveBeenCalledWith(plan));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("restores archived plans and tasks through named restore icons", async () => {
    const archivedPlan = { ...plan, archivedAt: now };
    const archivedTask = { ...task, archivedAt: now };
    const restorePlan = vi
      .spyOn(api, "restorePlan")
      .mockResolvedValue({ ...plan, revision: 2 });
    const planClose = vi.fn();
    const { unmount } = renderWithMantine(
      <PlanEditor
        plan={archivedPlan}
        tasks={[]}
        workflow={workflow}
        archived
        onClose={planClose}
        onSaved={vi.fn().mockResolvedValue(undefined)}
        onError={vi.fn()}
      />,
    );
    const restorePlanButton = screen.getByRole("button", {
      name: "Restore plan",
    });
    fireEvent.mouseEnter(restorePlanButton);
    await waitFor(() =>
      expect(
        screen.getByRole("tooltip", { name: "Restore plan" }),
      ).toBeTruthy(),
    );
    fireEvent.click(restorePlanButton);
    await waitFor(() => expect(restorePlan).toHaveBeenCalledWith(archivedPlan));
    expect(planClose).toHaveBeenCalledOnce();
    unmount();

    const restoreTask = vi
      .spyOn(api, "restoreTask")
      .mockResolvedValue({ ...task, revision: 2 });
    renderWithMantine(
      <TaskEditor
        task={archivedTask}
        planKey="EP-1"
        workflow={workflow}
        archived
        onSelectPlan={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn().mockResolvedValue(undefined)}
        onError={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Restore task" }));
    await waitFor(() => expect(restoreTask).toHaveBeenCalledWith(archivedTask));
  });

  it("archives tasks and subtasks through named trash icons", async () => {
    const archiveTask = vi
      .spyOn(api, "archiveTask")
      .mockResolvedValue({ ...task, archivedAt: now });
    renderWithMantine(
      <TaskEditor
        task={task}
        planKey="EP-1"
        workflow={workflow}
        archived={false}
        onSelectPlan={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn().mockResolvedValue(undefined)}
        onError={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Archive task" }));
    await waitFor(() => expect(archiveTask).toHaveBeenCalledWith(task));
    cleanup();

    const keyedTask = {
      ...task,
      key: "EP-2",
      subtasks: task.subtasks.map((item, index) => ({
        ...item,
        key: `EP-${index + 3}`,
      })),
    };
    const archiveSubtask = vi
      .spyOn(api, "archiveSubtask")
      .mockResolvedValue({ ...keyedTask, revision: 2 });
    renderWithMantine(
      <TaskEditor
        task={keyedTask}
        planKey="EP-1"
        workflow={workflow}
        archived={false}
        onSelectPlan={vi.fn()}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onError={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Done work" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit subtask" }));
    const archiveSubtaskButton = screen.getByRole("button", {
      name: "Archive subtask",
    });
    expect(
      archiveSubtaskButton.querySelector("svg")?.getAttribute("class"),
    ).toContain("tabler-icon-trash");
    fireEvent.click(archiveSubtaskButton);
    await waitFor(() =>
      expect(archiveSubtask).toHaveBeenCalledWith(keyedTask, "one"),
    );
  });
});
