import { EventEmitter } from "node:events";
import type { Server } from "node:net";
import { TaskdroidError } from "@culto/taskdroid-core";
import { describe, expect, it, vi } from "vitest";
import {
  dashboardListenError,
  dashboardStartupMessage,
  startDashboardServer,
  waitForDashboardListen,
} from "./dashboardServer.js";

describe("dashboard server startup", () => {
  it("maps an occupied port to an actionable Taskdroid error", async () => {
    const server = new EventEmitter() as unknown as Server;
    const waiting = waitForDashboardListen(server, "127.0.0.1", 4317);
    server.emit(
      "error",
      Object.assign(new Error("address already in use"), { code: "EADDRINUSE" }),
    );

    await expect(waiting).rejects.toMatchObject({
      code: "PORT_IN_USE",
      message:
        "Dashboard port 127.0.0.1:4317 is already in use. Try taskdroid ui --port 4318.",
    });
  });

  it("preserves unrelated server errors", () => {
    const error = Object.assign(new Error("permission denied"), { code: "EACCES" });

    expect(dashboardListenError(error, "127.0.0.1", 4317)).toBe(error);
    expect(dashboardListenError(error, "127.0.0.1", 4317)).not.toBeInstanceOf(
      TaskdroidError,
    );
  });

  it("identifies the running version and project when the dashboard starts", () => {
    expect(
      dashboardStartupMessage(
        "0.1.2",
        "/projects/taskdroid",
        "http://127.0.0.1:4317",
      ),
    ).toBe(
      "Taskdroid 0.1.2\nProject: /projects/taskdroid\nDashboard: http://127.0.0.1:4317",
    );
  });

  it("uses the first available higher port when explicitly requested", async () => {
    const attemptedPorts: number[] = [];
    const started = await startDashboardServer(
      (port) => {
        attemptedPorts.push(port);
        return listeningServer(port < 4319);
      },
      "127.0.0.1",
      4317,
      { useNextAvailablePort: true },
    );

    expect(started.port).toBe(4319);
    expect(attemptedPorts).toEqual([4317, 4318, 4319]);
  });

  it("retries after an interactive confirmation", async () => {
    const confirmNextAvailablePort = vi.fn().mockResolvedValue(true);
    const started = await startDashboardServer(
      (port) => listeningServer(port === 4317),
      "127.0.0.1",
      4317,
      { confirmNextAvailablePort },
    );

    expect(started.port).toBe(4318);
    expect(confirmNextAvailablePort).toHaveBeenCalledWith(4318);
  });

  it("keeps the original port error when retry is declined", async () => {
    await expect(
      startDashboardServer(
        () => listeningServer(true),
        "127.0.0.1",
        4317,
        { confirmNextAvailablePort: async () => false },
      ),
    ).rejects.toMatchObject({ code: "PORT_IN_USE" });
  });
});

function listeningServer(portIsOccupied: boolean): Server {
  const server = new EventEmitter() as unknown as Server;
  queueMicrotask(() =>
    server.emit(
      portIsOccupied ? "error" : "listening",
      ...(portIsOccupied
        ? [Object.assign(new Error("address already in use"), { code: "EADDRINUSE" })]
        : []),
    ),
  );
  return server;
}
