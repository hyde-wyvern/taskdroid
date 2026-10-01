#!/usr/bin/env node
import { Command } from "commander";
import { basename } from "node:path";
import open from "open";
import {
  findProjectRoot,
  TaskdroidError,
  TaskdroidService,
} from "@taskdroid/core";
import { createApp } from "@taskdroid/server";
import { runMcpServer } from "@taskdroid/mcp";
import {
  confirmManagedInstructions,
  writeManagedInstructions,
} from "./agentInstructions.js";
import { resolveWebRoot } from "./webAssets.js";

const program = new Command()
  .name("taskdroid")
  .description("Local task management for AI agents")
  .version("0.1.0");

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
  .option("--no-open")
  .description("Start local dashboard")
  .action(async (options) => {
    const service = await currentService();
    const webRoot = resolveWebRoot(import.meta.url);
    const port = Number.parseInt(options.port, 10);
    if (!Number.isInteger(port) || port < 1 || port > 65535)
      throw new TaskdroidError(
        "INVALID_PORT",
        "Port must be from 1 through 65535",
      );
    const app = createApp(service, webRoot);
    app.listen(port, options.host, async () => {
      const url = `http://${options.host}:${port}`;
      console.log(`Taskdroid dashboard: ${url}`);
      if (options.open) await open(url);
    });
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
  return TaskdroidService.open(await findProjectRoot());
}
