import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, describe, expect, it } from "vitest";
import { TaskdroidService } from "@culto/taskdroid-core";
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
      const toolsByName = new Map(tools.tools.map((tool) => [tool.name, tool]));
      expect([...toolsByName.keys()]).toEqual([
        "get_project",
        "list_documents",
        "get_document",
        "update_document",
        "list_plans",
        "get_plan",
        "create_plan",
        "update_plan",
        "archive_plan",
        "restore_plan",
        "list_tasks",
        "get_task",
        "get_subtask",
        "create_task",
        "update_task",
        "claim_task",
        "plan_task",
        "create_subtask",
        "update_subtask",
        "move_work_item",
        "archive_work_item",
        "restore_work_item",
        "get_workflow",
      ]);
      const readOnlyNames = [
        "get_project",
        "list_documents",
        "get_document",
        "list_plans",
        "get_plan",
        "list_tasks",
        "get_task",
        "get_subtask",
        "get_workflow",
      ];
      for (const name of readOnlyNames)
        expect(toolsByName.get(name)?.annotations).toEqual({
          readOnlyHint: true,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        });
      for (const name of ["create_plan", "create_task", "create_subtask"])
        expect(toolsByName.get(name)?.annotations).toEqual({
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        });
      for (const name of [
        "update_document",
        "update_plan",
        "update_task",
        "update_subtask",
        "archive_plan",
        "archive_work_item",
        "plan_task",
      ])
        expect(toolsByName.get(name)?.annotations).toEqual({
          readOnlyHint: false,
          destructiveHint: true,
          idempotentHint: false,
          openWorldHint: false,
        });
      for (const name of [
        "restore_plan",
        "claim_task",
        "move_work_item",
        "restore_work_item",
      ])
        expect(toolsByName.get(name)?.annotations).toEqual({
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: false,
          openWorldHint: false,
        });
      expect(toolsByName.get("plan_task")?.inputSchema).toMatchObject({
        required: ["id", "expectedRevision", "plan", "subtasks"],
      });
      expect(
        Object.keys(toolsByName.get("plan_task")?.inputSchema.properties ?? {}),
      ).toEqual(["id", "expectedRevision", "plan", "subtasks", "replace"]);
      expect(tools.tools.map((tool) => tool.name)).toContain("create_plan");
      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(["get_project", "get_workflow"]),
      );
      expect(tools.tools.map((tool) => tool.name)).toEqual(
        expect.arrayContaining(["get_plan", "get_task", "get_subtask"]),
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
      const plan = (await service.listPlans())[0];
      const planByKey = await client.callTool({
        name: "get_plan",
        arguments: { key: plan.key },
      });
      expect(planByKey.isError).not.toBe(true);
      expect(JSON.stringify(planByKey.content)).toContain(plan.key);
      const planById = await client.callTool({
        name: "get_plan",
        arguments: { id: plan.id },
      });
      expect(planById.isError).not.toBe(true);
      const task = (await service.listTasks())[0];
      const taskByKey = await client.callTool({
        name: "get_task",
        arguments: { key: task.key },
      });
      expect(taskByKey.isError).not.toBe(true);
      expect(JSON.stringify(taskByKey.content)).toContain(task.key);
      const taskById = await client.callTool({
        name: "get_task",
        arguments: { id: task.id },
      });
      expect(taskById.isError).not.toBe(true);
      const createdSubtask = await client.callTool({
        name: "create_subtask",
        arguments: {
          taskId: task.id,
          expectedRevision: task.revision,
          subtask: { title: "MCP child", effort: 2 },
        },
      });
      expect(createdSubtask.isError).not.toBe(true);
      const updatedTask = await service.getTask(task.id);
      const staleUpdate = await client.callTool({
        name: "update_task",
        arguments: {
          id: task.id,
          expectedRevision: task.revision,
          title: "Stale MCP edit",
        },
      });
      expect(staleUpdate.isError).toBe(true);
      expect(JSON.stringify(staleUpdate.content)).toContain("REVISION_CONFLICT");
      expect((await service.getTask(task.id)).title).toBe(task.title);
      const subtask = updatedTask.subtasks[0];
      const subtaskByKey = await client.callTool({
        name: "get_subtask",
        arguments: { key: subtask.key },
      });
      expect(subtaskByKey.isError).not.toBe(true);
      expect(JSON.stringify(subtaskByKey.content)).toContain(subtask.key);
      const subtaskById = await client.callTool({
        name: "get_subtask",
        arguments: { id: subtask.id },
      });
      expect(subtaskById.isError).not.toBe(true);
      const invalidLookup = await client.callTool({
        name: "get_task",
        arguments: { id: task.id, key: task.key },
      });
      expect(invalidLookup.isError).toBe(true);
      await client.callTool({
        name: "claim_task",
        arguments: { id: task.id, expectedRevision: updatedTask.revision },
      });
      expect((await service.getTask(task.id)).statusId).toBe("in-progress");
    } finally {
      await Promise.all([client.close(), server.close()]);
    }
  });
});
