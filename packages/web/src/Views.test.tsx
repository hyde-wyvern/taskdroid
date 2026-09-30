import type { Plan, Task, Workflow } from "./types";
import { afterEach, describe, expect, it, vi } from "vitest";
// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";

import { ListView } from "./ListView";
import { PlansView } from "./PlansView";
import { renderWithMantine } from "./testUtils";

afterEach(cleanup);
const workflow: Workflow = {
  schemaVersion: 1,
  revision: 1,
  updatedAt: new Date().toISOString(),
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
  title: "Platform",
  summary: "Build platform",
  sourcePlan: "",
  statusId: "todo",
  archivedAt: null,
  progress: { completedEffort: 2, totalEffort: 10, percentage: 20 },
};
const task: Task = {
  id: "task",
  planId: "plan",
  revision: 1,
  title: "Queued work",
  description: "",
  plan: "",
  statusId: "backlog",
  effort: 10,
  archivedAt: null,
  subtasks: [
    {
      id: "subtask",
      taskId: "task",
      revision: 1,
      title: "Nested work",
      description: "",
      plan: "",
      statusId: "backlog",
      effort: 4,
      archivedAt: null,
    },
  ],
};

describe("project views", () => {
  it("shows plans with status and weighted progress", () => {
    const archivedPlan = {
      ...plan,
      id: "archived",
      title: "Archived platform",
      statusId: "closed",
      archivedAt: new Date().toISOString(),
    };
    renderWithMantine(
      <PlansView
        plans={[plan, archivedPlan]}
        workflow={workflow}
        onSelect={vi.fn()}
        onMove={vi.fn()}
        onCreate={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Platform" })).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Platform status" }),
    ).toHaveProperty("value", "todo");
    expect(
      screen
        .getByRole("progressbar", { name: "Platform progress" })
        .getAttribute("aria-valuenow"),
    ).toBe("20");
    expect(
      screen
        .getByRole("button", { name: "Archived platform" })
        .closest(".plan-card")
        ?.classList.contains("archived"),
    ).toBe(true);
    expect(
      screen
        .getByRole("button", { name: "Archived platform" })
        .classList.contains("closed-title"),
    ).toBe(true);
    expect(
      screen
        .getByRole("combobox", { name: "Archived platform status" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("lists all tasks by plan with aligned status controls and expandable subtasks", () => {
    const secondPlan = { ...plan, id: "second-plan", title: "Mobile" };
    const onSelectPlan = vi.fn();
    const onSelectTask = vi.fn();
    const onSelectSubtask = vi.fn();
    const activeTask = {
      ...task,
      id: "active",
      title: "Active work",
      statusId: "todo",
      subtasks: [],
    };
    renderWithMantine(
      <ListView
        plans={[plan, secondPlan]}
        tasks={[task, activeTask]}
        workflow={workflow}
        onSelectPlan={onSelectPlan}
        onSelectTask={onSelectTask}
        onSelectSubtask={onSelectSubtask}
        onChanged={vi.fn()}
        onError={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Platform" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mobile" })).toBeTruthy();
    expect(screen.getByText("Queued work")).toBeTruthy();
    expect(screen.getByText("Active work")).toBeTruthy();
    expect(
      screen.getByRole("combobox", { name: "Platform status" }),
    ).toHaveProperty("value", "todo");
    expect(
      screen.getByRole("combobox", { name: "Queued work status" }),
    ).toHaveProperty("value", "backlog");
    expect(screen.getAllByText("1 subtasks")).toHaveLength(2);
    expect(screen.getAllByText("10 points")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "+ New task" })).toHaveLength(
      2,
    );
    fireEvent.click(screen.getByRole("button", { name: "Platform" }));
    expect(onSelectPlan).toHaveBeenCalledWith(plan);
    fireEvent.click(screen.getByRole("button", { name: "Queued work" }));
    expect(onSelectTask).toHaveBeenCalledWith(task);
    expect(screen.queryByText("Nested work")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Expand Queued work subtasks" }),
    );
    expect(
      screen.getByRole("combobox", { name: "Nested work status" }),
    ).toHaveProperty("value", "backlog");
    const subtaskRowText =
      screen.getByRole("button", { name: "Nested work" }).parentElement
        ?.textContent ?? "";
    expect(subtaskRowText).toContain("4 points");
    expect(subtaskRowText).not.toContain("subtasks");
    fireEvent.click(screen.getByRole("button", { name: "Nested work" }));
    expect(onSelectSubtask).toHaveBeenCalledWith(task, "subtask");
    fireEvent.click(screen.getByRole("button", { name: "+ New subtask" }));
    expect(screen.getByPlaceholderText("Subtask title")).toBeTruthy();
    expect(
      Array.from(
        screen
          .getByRole("combobox", { name: "Subtask effort points" })
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
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse Platform plan" }),
    );
    expect(screen.queryByText("Queued work")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Expand Platform plan" }),
    );
    expect(screen.getByText("Queued work")).toBeTruthy();
  });
});
