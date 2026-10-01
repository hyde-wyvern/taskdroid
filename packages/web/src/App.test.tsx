// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { api } from "./api";
import { renderWithMantine } from "./testUtils";
import type { Plan, Project, Task, Workflow } from "./types";

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
  summary: "",
  sourcePlan: "",
  statusId: "todo",
  archivedAt: null,
  progress: { completedEffort: 0, totalEffort: 0, percentage: 0 },
};
const project: Project = {
  id: "project",
  revision: 1,
  name: "Taskdroid test",
  workflow,
  documents: {
    "description.md": "# Overview",
    "agents.md": "# Agent instructions",
  },
  plans: [plan],
};
const task: Task = {
  id: "task",
  planId: plan.id,
  revision: 1,
  title: "Linked task",
  description: "Task description",
  plan: "## Task plan",
  statusId: "todo",
  effort: 3,
  archivedAt: null,
  subtasks: [
    {
      id: "subtask",
      taskId: "task",
      revision: 1,
      title: "Linked subtask",
      description: "Subtask description",
      plan: "### Subtask plan",
      statusId: "todo",
      effort: 3,
      archivedAt: null,
    },
  ],
};

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

const onboardingStorageKey = (projectId: string) =>
  `taskdroid:onboarding:${projectId}`;

beforeEach(() => {
  window.localStorage.setItem(onboardingStorageKey(project.id), "complete");
});

describe("App navigation and selected-plan state", () => {
  it("shows onboarding before a deep link and restores it for repeat visits", async () => {
    window.localStorage.clear();
    window.history.replaceState(null, "", "/list?detail=task%3Atask");
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([task]);

    renderWithMantine(<App />);

    expect(
      await screen.findByRole("heading", { name: "Welcome to Taskdroid" }),
    ).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Linked task" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Continue to Taskdroid" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Linked task" }),
    ).toBeTruthy();
    expect(window.location.pathname + window.location.search).toBe(
      "/list?detail=task%3Atask",
    );
    expect(window.localStorage.getItem(onboardingStorageKey(project.id))).toBe(
      "complete",
    );

    cleanup();
    renderWithMantine(<App />);
    expect(
      await screen.findByRole("heading", { name: "Linked task" }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Welcome to Taskdroid" }),
    ).toBeNull();
  });

  it("shows onboarding separately for a different project in the same browser", async () => {
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue({
      ...project,
      id: "second-project",
    });
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([]);

    renderWithMantine(<App />);

    expect(
      await screen.findByRole("heading", { name: "Welcome to Taskdroid" }),
    ).toBeTruthy();
    expect(window.localStorage.getItem(onboardingStorageKey(project.id))).toBe(
      "complete",
    );
    expect(
      window.localStorage.getItem(onboardingStorageKey("second-project")),
    ).toBeNull();
  });

  it("opens onboarding from the keyboard-accessible logo button", async () => {
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([]);

    renderWithMantine(<App />);

    const logoButton = await screen.findByRole("button", {
      name: "Open Taskdroid onboarding",
    });
    expect(logoButton.tagName).toBe("BUTTON");
    logoButton.focus();
    expect(document.activeElement).toBe(logoButton);
    fireEvent.click(logoButton);
    expect(
      await screen.findByRole("heading", { name: "Welcome to Taskdroid" }),
    ).toBeTruthy();
  });

  it("keeps accessible view selection and plan filtering in sync", async () => {
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([]);

    renderWithMantine(<App />);

    const boardTab = await screen.findByRole("button", {
      name: "Board",
      exact: true,
    });
    const listTab = screen.getByRole("button", { name: "List", exact: true });
    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeTruthy();
    expect(
      document
        .querySelector(".app-header svg.logo circle")
        ?.getAttribute("fill"),
    ).toBe("var(--taskdroid-surface-raised)");
    expect(boardTab.getAttribute("aria-pressed")).toBe("true");
    expect(listTab.getAttribute("aria-pressed")).toBe("false");
    await waitFor(() => expect(window.location.pathname).toBe("/board"));
    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toContain(
      `${new Date().getFullYear()} Developed by Culto`,
    );
    expect(
      screen
        .getByRole("link", { name: "GNU GPL v3.0 or later" })
        .getAttribute("href"),
    ).toBe("https://www.gnu.org/licenses/gpl-3.0.html");
    expect(footer.textContent).not.toMatch(/copyright|©/i);

    const planFilter = await screen.findByRole("combobox", {
      name: "Plan filter",
    });
    fireEvent.change(planFilter, {
      target: { value: plan.id },
    });
    expect(window.location.search).toBe("");
    await waitFor(() =>
      expect(
        screen.getByRole("combobox", { name: "Plan filter" }),
      ).toHaveProperty("value", plan.id),
    );

    fireEvent.click(listTab);
    expect(listTab.getAttribute("aria-pressed")).toBe("true");
    expect(boardTab.getAttribute("aria-pressed")).toBe("false");
    expect(window.location.pathname).toBe("/list");
    expect(
      await screen.findByRole("heading", { name: "Platform" }),
    ).toBeTruthy();
  });

  it("groups Settings, Documentation, and the theme toggle in the burger menu", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([]);

    renderWithMantine(<App />);

    await screen.findByRole("button", { name: "Board", exact: true });
    const navigation = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(
      Array.from(navigation.querySelectorAll("button")).map((button) =>
        button.textContent?.trim(),
      ),
    ).toEqual(["Board", "List", "Project"]);
    const openMenu = () => {
      const trigger = screen.getByRole("button", { name: /menu/i });
      if (trigger.getAttribute("aria-expanded") !== "true") {
        fireEvent.click(trigger);
      }
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    };
    openMenu();
    const darkMode = document.querySelector<HTMLInputElement>(
      'input[aria-label="Dark mode"]',
    );
    expect(darkMode).toBeTruthy();
    expect(darkMode).toHaveProperty("checked", false);
    fireEvent.click(darkMode);
    await waitFor(() => expect(darkMode).toHaveProperty("checked", true));
    expect(
      document.documentElement.getAttribute("data-mantine-color-scheme"),
    ).toBe("dark");

    openMenu();
    fireEvent.click(document.querySelector('[aria-label="Settings"]')!);
    expect(
      await screen.findByRole("heading", { name: "Workflow settings" }),
    ).toBeTruthy();
    expect(window.location.pathname).toBe("/settings");

    openMenu();
    fireEvent.click(document.querySelector('[aria-label="Documentation"]')!);
    expect(
      await screen.findByRole("heading", { name: "Taskdroid documentation" }),
    ).toBeTruthy();
    expect(window.location.pathname).toBe("/documentation");
  });

  it("restores a direct Project document link and leaves filters out of the URL", async () => {
    window.history.replaceState(
      null,
      "",
      "/project?document=agents.md&search=private&planId=local-filter",
    );
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([]);

    renderWithMantine(<App />);

    expect(
      await screen.findByRole("heading", { name: "Agent instructions" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Project", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe(
        "/project?document=agents.md",
      ),
    );

    fireEvent.click(screen.getByRole("tab", { name: "description.md" }));
    expect(
      await screen.findByRole("heading", { name: "Overview" }),
    ).toBeTruthy();
    expect(window.location.search).toBe("?document=description.md");
    window.history.pushState(null, "", "/project?document=deleted.md");
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe(
        "/project?document=description.md",
      ),
    );
    fireEvent.change(screen.getByRole("searchbox", { name: "Search work" }), {
      target: { value: "local-only-filter" },
    });
    expect(window.location.search).toBe("?document=description.md");
  });

  it("restores nested detail routes and responds to Back/Forward popstate", async () => {
    window.history.replaceState(
      null,
      "",
      "/list?detail=task%3Atask&search=ignored",
    );
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([task]);

    renderWithMantine(<App />);

    expect(
      await screen.findByRole("heading", { name: "Linked task" }),
    ).toBeTruthy();
    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe(
        "/list?detail=task%3Atask",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Linked subtask" }));
    expect(
      await screen.findByRole("heading", { name: "Linked subtask" }),
    ).toBeTruthy();
    expect(window.location.search).toBe("?detail=subtask%3Atask%3Asubtask");

    window.history.pushState(null, "", "/list?detail=task%3Atask");
    await act(async () => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(
      await screen.findByRole("heading", { name: "Linked task" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "List", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe("/list"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Linked task" }));
    expect(
      await screen.findByRole("heading", { name: "Linked task" }),
    ).toBeTruthy();
    expect(window.location.pathname + window.location.search).toBe(
      "/list?detail=task%3Atask",
    );
  });

  it("opens a direct Project document and plan detail route", async () => {
    window.history.replaceState(
      null,
      "",
      "/project?document=agents.md&detail=plan%3Aplan&statusFilter=todo",
    );
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([]);

    renderWithMantine(<App />);

    expect(
      await screen.findByRole("heading", { name: "Agent instructions" }),
    ).toBeTruthy();
    expect(
      await screen.findByRole("heading", { name: "Platform" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Project", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe(
        "/project?document=agents.md&detail=plan%3Aplan",
      ),
    );
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe(
        "/project?document=agents.md",
      ),
    );
  });

  it("opens a direct subtask route and drops stale work-item links safely", async () => {
    window.history.replaceState(
      null,
      "",
      "/board?detail=subtask%3Atask%3Asubtask",
    );
    vi.stubGlobal(
      "EventSource",
      class {
        close = vi.fn();
        addEventListener = vi.fn();
      },
    );
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([task]);

    renderWithMantine(<App />);

    expect(
      await screen.findByRole("heading", { name: "Linked subtask" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "Board", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(window.location.pathname + window.location.search).toBe(
      "/board?detail=subtask%3Atask%3Asubtask",
    );

    cleanup();
    window.history.replaceState(null, "", "/list?detail=task%3Amissing");
    vi.restoreAllMocks();
    vi.spyOn(api, "project").mockResolvedValue(project);
    vi.spyOn(api, "plans").mockResolvedValue([plan]);
    vi.spyOn(api, "tasks").mockResolvedValue([]);
    renderWithMantine(<App />);

    await waitFor(() =>
      expect(window.location.pathname + window.location.search).toBe("/list"),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
