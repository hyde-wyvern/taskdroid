import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { TaskdroidService } from "@taskdroid/core";
import { createMcpServer } from "./index.js";

const roots: string[] = [];
afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

describe("MCP contract", () => {
  it("creates a plan, manages focused documents, claims a task, and exposes workflow", async () => {
    const root = await mkdtemp(join(tmpdir(), "taskdroid-mcp-"));
    roots.push(root);
    const service = await TaskdroidService.initialize(root, "MCP");
    const server = createMcpServer(service);
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
    try {
      const tools = await client.listTools();
      expect(tools.tools.map((tool) => tool.name)).toContain("create_plan");
      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(["get_project", "get_workflow"]),
      );
      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining([
          "list_documents",
          "get_document",
          "update_document",
        ]),
      );
      const projectResult = await client.callTool({
        name: "get_project",
        arguments: {},
      });
      expect(projectResult.isError).not.toBe(true);
      expect(JSON.stringify(projectResult.content)).toContain("MCP");
      const workflowResult = await client.callTool({
        name: "get_workflow",
        arguments: {},
      });
      expect(workflowResult.isError).not.toBe(true);
      expect(JSON.stringify(workflowResult.content)).toContain("Backlog");
      expect(JSON.stringify(workflowResult.content)).toContain("Closed");
      const project = await service.getProject();
      await client.callTool({
        name: "update_document",
        arguments: {
          name: "agents.md",
          content: "# Agent rules",
          expectedRevision: project.revision,
        },
      });
      const document = await client.callTool({
        name: "get_document",
        arguments: { name: "agents.md" },
      });
      expect(JSON.stringify(document.content)).toContain("# Agent rules");
      const created = await client.callTool({
        name: "create_plan",
        arguments: { title: "MCP Plan", tasks: [{ title: "Task", effort: 5 }] },
      });
      expect(created.isError).not.toBe(true);
      const task = (await service.listTasks())[0];
      await client.callTool({
        name: "claim_task",
        arguments: { id: task.id, expectedRevision: task.revision },
      });
      expect((await service.getTask(task.id)).statusId).toBe("in-progress");
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });
});
