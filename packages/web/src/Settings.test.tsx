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
});
