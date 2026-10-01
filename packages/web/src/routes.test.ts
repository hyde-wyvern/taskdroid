import { describe, expect, it } from "vitest";
import { parseRoute, serializeRoute, type AppRoute } from "./routes";

describe("app routes", () => {
  it.each([
    { view: "board" },
    { view: "list" },
    { view: "plans", documentName: "release.v2_notes.md" },
    { view: "settings" },
    { view: "documentation" },
    { view: "board", detail: { kind: "plan", id: "plan-1" } },
    { view: "list", detail: { kind: "task", id: "task_2" } },
    {
      view: "list",
      detail: { kind: "subtask", taskId: "task-2", id: "subtask_3" },
    },
    {
      view: "plans",
      documentName: "agents.md",
      detail: { kind: "task", id: "task-4" },
    },
  ] satisfies AppRoute[])("round-trips $view route state", (route) => {
    expect(parseRoute(serializeRoute(route))).toEqual(route);
  });

  it("uses canonical Project paths and never serializes filters", () => {
    const route: AppRoute = {
      view: "plans",
      documentName: "agent.notes.md",
      detail: { kind: "subtask", taskId: "task-1", id: "subtask-2" },
    };
    const url = serializeRoute(route);
    expect(url.startsWith("/project?")).toBe(true);
    expect(url).toContain("document=agent.notes.md");
    expect(url).toContain("detail=subtask%3Atask-1%3Asubtask-2");
    expect(url).not.toMatch(/search|filter|planId|statusId/i);
    expect(
      parseRoute(
        "/project?document=agent.notes.md&detail=subtask%3Atask-1%3Asubtask-2&search=ignored&planId=ignored",
      ),
    ).toEqual(route);
  });

  it("normalizes unknown views and drops invalid route targets without throwing", () => {
    expect(parseRoute("/unknown?detail=task%3A123")).toEqual({ view: "board" });
    expect(
      parseRoute("/project?document=../unsafe.md&detail=task%3Ainvalid%2Fid"),
    ).toEqual({ view: "plans" });
    expect(parseRoute("/list?detail=subtask%3Atask-1")).toEqual({
      view: "list",
    });
    expect(
      serializeRoute({ view: "plans", documentName: "../unsafe.md" }),
    ).toBe("/project");
  });
});
