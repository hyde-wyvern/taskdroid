import type { Plan, Workflow } from "./types";
import { afterEach, describe, expect, it, vi } from "vitest";
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { WorkFilters } from "./WorkFilters";

afterEach(cleanup);
const plan: Plan = {
  id: "plan",
  revision: 1,
  title: "Platform",
  summary: "",
  sourcePlan: "",
  statusId: "todo",
  archivedAt: null,
  progress: { completedEffort: 3, totalEffort: 8, percentage: 38 },
};
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
const allStatuses = {
  search: "",
  planStatusIds: null,
  taskStatusIds: null,
  subtaskStatusIds: null,
};

describe("WorkFilters", () => {
  it("shows plain plan titles, progress, and updates work filters", () => {
    const onChange = vi.fn();
    render(
      <WorkFilters
        plans={[plan]}
        planId="plan"
        workflow={workflow}
        progress={plan.progress}
        values={allStatuses}
        onPlanChange={vi.fn()}
        onChange={onChange}
        onClear={vi.fn()}
      />,
    );
    expect(screen.getByRole("option", { name: "Platform" })).toBeTruthy();
    expect(screen.getByText("38% - 3/8 points")).toBeTruthy();
    expect(
      screen
        .getByRole("progressbar", { name: "Visible work progress" })
        .getAttribute("aria-valuenow"),
    ).toBe("38");
    fireEvent.change(screen.getByRole("searchbox", { name: "Search work" }), {
      target: { value: "agent" },
    });
    expect(onChange).toHaveBeenCalledWith({ ...allStatuses, search: "agent" });
    expect(screen.getByText("Status: All")).toBeTruthy();
    fireEvent.click(screen.getByText("Status: All"));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Todo" })[0]);
    expect(onChange).toHaveBeenLastCalledWith({
      ...allStatuses,
      planStatusIds: ["backlog", "closed"],
    });
  });

  it("shows supplied visible-work progress and clears all filters", () => {
    const onClear = vi.fn();
    render(
      <WorkFilters
        plans={[plan]}
        planId=""
        workflow={workflow}
        progress={{ completedEffort: 5, totalEffort: 12, percentage: 42 }}
        values={allStatuses}
        onPlanChange={vi.fn()}
        onChange={vi.fn()}
        onClear={onClear}
      />,
    );
    expect(screen.getByText("42% - 5/12 points")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
