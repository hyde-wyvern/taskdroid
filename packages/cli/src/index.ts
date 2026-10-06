#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { createInterface } from "node:readline/promises";
import open from "open";
import {
  findProjectRoot,
  TaskdroidError,
  TaskdroidService,
} from "@culto/taskdroid-core";
import { createApp } from "@culto/taskdroid-server";
import { runMcpServer } from "@culto/taskdroid-mcp";
import {
  confirmManagedInstructions,
  writeManagedInstructions,
} from "./agentInstructions.js";
import {
  dashboardStartupMessage,
  startDashboardServer,
} from "./dashboardServer.js";
import { resolveWebRoot } from "./webAssets.js";

const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { version: string };

const program = new Command()
  .name("taskdroid")
  .description("Local task management for AI agents")
  .version(version);

program
  .command("init")
  .option("--name <name>")
  .option(
    "--manage-agent-instructions",
    "replace root AGENTS.md with Taskdroid instructions",
  )
  .description("Initialize current directory")
  .action(async ({ name, manageAgentInstructions }) => {
    const root = process.cwd();
    await TaskdroidService.initialize(root, name ?? basename(root));
    if (
      manageAgentInstructions ||
      (manageAgentInstructions === undefined &&
        (await confirmManagedInstructions()))
    ) {
      await writeManagedInstructions(root);
      console.log("Taskdroid now manages root AGENTS.md");
    }
    console.log(`Initialized Taskdroid project in ${root}/.taskdroid`);
  });

program
  .command("ui")
  .option("--host <host>", "bind host", "127.0.0.1")
  .option("--port <port>", "bind port", "4317")
  .option(
    "--next-available-port",
    "use the next available port when the requested port is occupied",
  )
  .option("--no-open")
  .description("Start local dashboard")
  .action(async (options) => {
    const { root, service } = await currentProject();
    const webRoot = resolveWebRoot(import.meta.url);
    const port = Number.parseInt(options.port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new TaskdroidError(
        "INVALID_PORT",
        "Port must be from 1 through 65535",
      );
    const app = createApp(service, webRoot);
    const started = await startDashboardServer(
      (candidatePort) => app.listen(candidatePort, options.host),
      options.host,
      port,
      {
        useNextAvailablePort: options.nextAvailablePort,
        confirmNextAvailablePort:
          process.stdin.isTTY && process.stdout.isTTY
            ? confirmNextAvailablePort
            : undefined,
      },
    );
    const url = `http://${options.host}:${started.port}`;
    console.log(dashboardStartupMessage(version, root, url));
    if (options.open) await open(url);
  });

program
  .command("mcp")
  .description("Run stdio MCP server")
  .action(async () => runMcpServer(await currentService()));
program
  .command("validate")
  .description("Validate project data")
  .action(async () =>
    console.log(
      JSON.stringify(await (await currentService()).validate(), null, 2),
    ),
  );

program.parseAsync().catch((error) => {
  if (error instanceof TaskdroidError)
    console.error(`${error.code}: ${error.message}`);
  else console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function currentService(): Promise<TaskdroidService> {
  return (await currentProject()).service;
}

async function currentProject(): Promise<{
  root: string;
  service: TaskdroidService;
}> {
  const root = await findProjectRoot();
  return { root, service: await TaskdroidService.open(root) };
}

async function confirmNextAvailablePort(port: number): Promise<boolean> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(
      `Dashboard port is occupied. Start on the next available port, beginning with ${port}? [y/N] `,
    );
    return /^(y|yes)$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}
