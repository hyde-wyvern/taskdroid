// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProjectView } from "./ProjectView";
import { renderWithMantine } from "./testUtils";
import type { Plan, Project, Workflow } from "./types";

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

const plan: Plan = {
  id: "plan",
  revision: 1,
  title: "Platform",
  summary: "Build the platform",
  sourcePlan: "",
  statusId: "todo",
  archivedAt: null,
  progress: { completedEffort: 0, totalEffort: 0, percentage: 0 },
};

afterEach(cleanup);

describe("ProjectView documents", () => {
  it("keeps the document workspace before a distinct Plans rail", () => {
    renderWithMantine(
      <ProjectView
        project={{ ...project, plans: [plan] }}
        plans={[plan]}
        workflow={workflow}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
        onMove={vi.fn().mockResolvedValue(undefined)}
        onSave={vi.fn().mockResolvedValue(undefined)}
        onError={vi.fn()}
      />,
    );

    const workspace = screen.getByRole("region", {
      name: "Project documents",
    }).parentElement;
    const documentPane = screen.getByRole("region", {
      name: "Project documents",
    });
    const plansRail = screen.getByRole("complementary", {
      name: "Project plans",
    });
    expect(workspace?.classList.contains("project-workspace")).toBe(true);
    expect(documentPane.nextElementSibling).toBe(plansRail);
    expect(screen.getByRole("button", { name: "Platform" })).toBeTruthy();
  });

  it("renames documents in a dialog and discards cancelled drafts", async () => {
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
    const activeTab = screen.getByRole("tab", { name: "agents.md" });
    const editDocument = screen.getByRole("button", {
      name: "Edit document",
    });
    expect(
      activeTab.parentElement?.classList.contains("document-tab-item"),
    ).toBe(true);
    expect(activeTab.parentElement?.classList.contains("active")).toBe(true);
    expect(editDocument.parentElement).toBe(activeTab.parentElement);
    expect(editDocument.closest(".document-tab-item")).toBe(
      activeTab.parentElement,
    );
    expect(
      screen
        .queryByRole("button", { name: "Edit document" })
        ?.closest(".view-heading"),
    ).toBeNull();
    fireEvent.mouseEnter(editDocument);
    await waitFor(() =>
      expect(
        screen.getByRole("tooltip", { name: "Edit document" }),
      ).toBeTruthy(),
    );
    fireEvent.click(editDocument);
    expect(screen.getByRole("dialog", { name: "Edit document" })).toBeTruthy();
    expect(
      screen.getByRole("textbox", { name: "Document title" }),
    ).toHaveProperty("value", "agents");
    fireEvent.change(screen.getByRole("textbox", { name: "Document title" }), {
      target: { value: "discarded-name" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Document content (Markdown)" }),
      { target: { value: "# Discarded draft" } },
    );
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("heading", { name: "Agent rules" })).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Document title" }), {
      target: { value: "team-rules" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Document content (Markdown)" }),
      { target: { value: "# Saved rules" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save document" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        "description.md": project.documents["description.md"],
        "team-rules.md": "# Saved rules",
      }),
    );
    expect(screen.getByRole("tab", { name: "team-rules.md" })).toHaveProperty(
      "ariaSelected",
      "true",
    );
  });

  it("creates and deletes documents through the dialog and rejects duplicates", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
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

    fireEvent.click(screen.getByRole("button", { name: "Add document" }));
    expect(screen.getByRole("dialog", { name: "New document" })).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Document title" }), {
      target: { value: "description" },
    });
    expect(
      screen.getByText("A document with this title already exists"),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Save document" }),
    ).toHaveProperty("disabled", true);

    fireEvent.change(screen.getByRole("textbox", { name: "Document title" }), {
      target: { value: "meeting-notes" },
    });
    fireEvent.change(
      screen.getByRole("textbox", { name: "Document content (Markdown)" }),
      { target: { value: "## Notes" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save document" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ...project.documents,
        "meeting-notes.md": "## Notes",
      }),
    );
    expect(screen.getByRole("heading", { name: "Notes" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Edit document" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete document" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenLastCalledWith(project.documents),
    );
    expect(screen.queryByRole("tab", { name: "meeting-notes.md" })).toBeNull();
  });
});
