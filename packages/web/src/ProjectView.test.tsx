// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectView } from "./ProjectView";
import { renderWithMantine } from "./testUtils";
import type { Project, Workflow } from "./types";

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

const project: Project = {
  id: "project",
  revision: 1,
  name: "Taskdroid test",
  workflow,
  documents: {
    "description.md": "# Project overview\n\nA **local** project.",
    "agents.md": "## Agent rules\n\nUse _clear_ rules.",
  },
  plans: [],
};

afterEach(cleanup);

describe("ProjectView documents", () => {
  it("selects tabs, discards cancelled drafts, and saves document edits", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithMantine(
      <ProjectView
        project={project}
        plans={[]}
        workflow={workflow}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onMove={vi.fn().mockResolvedValue(undefined)}
        onSave={onSave}
        onError={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("tab", { name: "agents.md" }));
    expect(
      screen
        .getByRole("tab", { name: "agents.md" })
        .getAttribute("aria-selected"),
    ).toBe("true");
    expect(screen.getByRole("heading", { name: "Agent rules" })).toBeTruthy();
    expect(screen.getByText("clear").tagName).toBe("EM");
    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "agents.md content" }),
      {
        target: { value: "Discarded draft" },
      },
    );
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("heading", { name: "Agent rules" })).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "agents.md content" }),
      {
        target: { value: "# Saved rules" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save documents" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ...project.documents,
        "agents.md": "# Saved rules",
      }),
    );
  });
});
