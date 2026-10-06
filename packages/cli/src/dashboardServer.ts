import type { Server } from "node:net";
import { TaskdroidError } from "@culto/taskdroid-core";

export type DashboardServerStarter = (port: number) => Server;

export type DashboardPortRetryOptions = {
  useNextAvailablePort?: boolean;
  confirmNextAvailablePort?: (port: number) => Promise<boolean>;
};

export function waitForDashboardListen(
  server: Server,
  host: string,
  port: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off("error", onError);
      server.off("listening", onListening);
    };
    const onError = (error: Error) => {
      cleanup();
      reject(dashboardListenError(error, host, port));
    };
    const onListening = () => {
      cleanup();
      resolve();
    };

    server.once("error", onError);
    server.once("listening", onListening);
  });
}

export function dashboardListenError(
  error: Error,
  host: string,
  port: number,
): Error {
  if ((error as NodeJS.ErrnoException).code !== "EADDRINUSE") return error;

  const alternativePort = nextDashboardPort(port);
  return new TaskdroidError(
    "PORT_IN_USE",
    alternativePort
      ? `Dashboard port ${host}:${port} is already in use. Try taskdroid ui --port ${alternativePort}.`
      : `Dashboard port ${host}:${port} is already in use. Choose another port from 1 through 65535.`,
  );
}

export async function startDashboardServer(
  start: DashboardServerStarter,
  host: string,
  requestedPort: number,
  options: DashboardPortRetryOptions = {},
): Promise<{ server: Server; port: number }> {
  try {
    return await listen(start, host, requestedPort);
  } catch (error) {
    if (!isPortInUseError(error)) throw error;
    const nextPort = nextDashboardPort(requestedPort);
    if (!nextPort) throw error;

    const shouldRetry = options.useNextAvailablePort
      ? true
      : await options.confirmNextAvailablePort?.(nextPort);
    if (!shouldRetry) throw error;

    return listenOnNextAvailablePort(start, host, nextPort);
  }
}

async function listen(
  start: DashboardServerStarter,
  host: string,
  port: number,
): Promise<{ server: Server; port: number }> {
  const server = start(port);
  await waitForDashboardListen(server, host, port);
  return { server, port };
}

async function listenOnNextAvailablePort(
  start: DashboardServerStarter,
  host: string,
  port: number,
): Promise<{ server: Server; port: number }> {
  let candidate = port;
  while (true) {
    try {
      return await listen(start, host, candidate);
    } catch (error) {
      if (!isPortInUseError(error)) throw error;
      const nextPort = nextDashboardPort(candidate);
      if (!nextPort) throw error;
      candidate = nextPort;
    }
  }
}

function isPortInUseError(error: unknown): error is TaskdroidError {
  return error instanceof TaskdroidError && error.code === "PORT_IN_USE";
}

function nextDashboardPort(port: number): number | undefined {
  return port < 65535 ? port + 1 : undefined;
}

export function dashboardStartupMessage(
  version: string,
  root: string,
  url: string,
): string {
  return `Taskdroid ${version}\nProject: ${root}\nDashboard: ${url}`;
}
