// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { colorSchemeStorageKey } from "./colorScheme";
import { Settings } from "./Settings";
import { ThemeProvider } from "./ThemeProvider";
import { api } from "./api";
import type { Workflow } from "./types";

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
    { id: "review", name: "Review", color: "#ca8a04", completed: false },
    {
      id: "closed",
      name: "Closed",
      color: "#334155",
      completed: true,
      fixed: "closed",
    },
  ],
};

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

describe("Settings", () => {
  it("persists selected color scheme without saving workflow settings", () => {
    render(
      <ThemeProvider>
        <Settings workflow={workflow} onSaved={vi.fn()} onError={vi.fn()} />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("combobox", { name: "Color scheme" }));
    fireEvent.click(screen.getByRole("option", { name: "Dark" }));
    expect(localStorage.getItem(colorSchemeStorageKey)).toBe("dark");
  });

  it("keeps workflow changes local until Save workflow", async () => {
    const updateWorkflow = vi
      .spyOn(api, "updateWorkflow")
      .mockResolvedValue({ ...workflow, startStatusId: "review", revision: 2 });
    const onSaved = vi.fn().mockResolvedValue(undefined);
    render(
      <ThemeProvider>
        <Settings workflow={workflow} onSaved={onSaved} onError={vi.fn()} />
      </ThemeProvider>,
    );

    fireEvent.change(
      screen.getByRole("combobox", { name: "Claimed tasks start in" }),
      { target: { value: "review" } },
    );
    expect(updateWorkflow).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save workflow" }));

    await waitFor(() =>
      expect(updateWorkflow).toHaveBeenCalledWith(
        workflow,
        expect.objectContaining({ startStatusId: "review" }),
        {},
      ),
    );
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("saves fixed-status colors while protecting the claimed start status", async () => {
    const updateWorkflow = vi.spyOn(api, "updateWorkflow").mockResolvedValue({
      ...workflow,
      statuses: workflow.statuses
        .map((status) =>
          status.id === "backlog"
            ? { ...status, color: "#123456" }
            : status.id === "closed"
              ? { ...status, color: "#654321" }
              : status.id === "review"
                ? undefined
                : status,
        )
        .filter((status) => status !== undefined),
      revision: 2,
    });
    render(
      <ThemeProvider>
        <Settings
          workflow={workflow}
          onSaved={vi.fn().mockResolvedValue(undefined)}
          onError={vi.fn()}
        />
      </ThemeProvider>,
    );

    const backlogColor = screen.getByLabelText("Backlog color");
    const closedColor = screen.getByLabelText("Closed color");
    fireEvent.change(backlogColor, { target: { value: "#123456" } });
    fireEvent.change(closedColor, { target: { value: "#654321" } });
    expect(backlogColor).not.toHaveProperty("disabled", true);
    expect(closedColor).not.toHaveProperty("disabled", true);
    expect(screen.getByLabelText("Backlog name")).toHaveProperty(
      "disabled",
      true,
    );
    expect(screen.getByLabelText("Closed name")).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getAllByRole("checkbox", { name: "Complete" })[0],
    ).toHaveProperty("disabled", true);
    expect(
      screen.getAllByRole("checkbox", { name: "Complete" }).at(-1),
    ).toHaveProperty("disabled", true);

    const claimedRemove = screen.getByRole("button", {
      name: "Remove Todo (claimed start status)",
    });
    expect(claimedRemove).toHaveProperty("disabled", true);
    fireEvent.click(claimedRemove);
    expect(
      screen.getByRole("combobox", { name: "Claimed tasks start in" }),
    ).toHaveProperty("value", "todo");

    fireEvent.click(screen.getByRole("button", { name: "Remove Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Save workflow" }));

    await waitFor(() =>
      expect(updateWorkflow).toHaveBeenCalledWith(
        workflow,
        expect.objectContaining({
          startStatusId: "todo",
          statuses: expect.arrayContaining([
            expect.objectContaining({
              id: "backlog",
              color: "#123456",
              fixed: "backlog",
            }),
            expect.objectContaining({
              id: "closed",
              color: "#654321",
              fixed: "closed",
            }),
          ]),
        }),
        { review: "backlog" },
      ),
    );
  });
});
