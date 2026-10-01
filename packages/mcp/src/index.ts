import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TaskdroidError, TaskdroidService } from "@taskdroid/core";

const effort = z.number().int().min(0).max(100);
const taskInput = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  effort,
  statusId: z.string().optional(),
});
const subtaskInput = taskInput.extend({ plan: z.string().optional() });
const revision = { expectedRevision: z.number().int().positive() };
const lookupIdentifier = {
  id: z.string().min(1).optional(),
  key: z.string().min(1).optional(),
};

export async function runMcpServer(service: TaskdroidService): Promise<void> {
  const server = createMcpServer(service);
  await server.connect(new StdioServerTransport());
}

export function createMcpServer(service: TaskdroidService): McpServer {
  const server = new McpServer({ name: "taskdroid", version: "0.1.0" });
  tool(
    server,
    "get_project",
    "Get current project, workflow, plans, and progress",
    {},
    async () => service.getProject(),
  );
  tool(
    server,
    "list_documents",
    "List project Markdown document names",
    {},
    async () => service.listDocuments(),
  );
  tool(
    server,
    "get_document",
    "Get one project Markdown document",
    { name: z.string().min(1) },
    async (args) => service.getDocument(args.name),
  );
  tool(
    server,
    "update_document",
    "Update one project Markdown document",
    { name: z.string().min(1), content: z.string(), ...revision },
    async (args) =>
      service.updateDocument(args.name, args.content, args.expectedRevision),
  );
  tool(
    server,
    "list_plans",
    "List plans and weighted progress",
    { includeArchived: z.boolean().optional() },
    async (args) => service.listPlans(args.includeArchived),
  );
  tool(
    server,
    "get_plan",
    "Get plan by ID or issue key, with tasks and progress",
    { ...lookupIdentifier, archived: z.boolean().optional() },
    async (args) => {
      const reference = recordReference(args);
      return reference.key
        ? service.getPlanByKey(reference.key, args.archived)
        : service.getPlan(reference.id!, args.archived);
    },
  );
  tool(
    server,
    "create_plan",
    "Create plan from agent-structured plan",
    {
      title: z.string(),
      summary: z.string().optional(),
      sourcePlan: z.string().optional(),
      statusId: z.string().optional(),
      tasks: z.array(taskInput).optional(),
    },
    async (args) => service.createPlan(args),
  );
  tool(
    server,
    "update_plan",
    "Update plan metadata or status",
    {
      id: z.string(),
      ...revision,
      title: z.string().optional(),
      summary: z.string().optional(),
      sourcePlan: z.string().optional(),
      statusId: z.string().optional(),
    },
    async ({ id, expectedRevision, ...changes }) =>
      service.updatePlan(id, expectedRevision, changes),
  );
  tool(
    server,
    "archive_plan",
    "Archive plan",
    { id: z.string(), ...revision },
    async (args) => service.archivePlan(args.id, args.expectedRevision),
  );
  tool(
    server,
    "restore_plan",
    "Restore plan",
    { id: z.string(), ...revision },
    async (args) => service.restorePlan(args.id, args.expectedRevision),
  );
  tool(
    server,
    "list_tasks",
    "List tasks with filters",
    {
      planId: z.string().optional(),
      statusId: z.string().optional(),
      includeArchived: z.boolean().optional(),
    },
    async (args) => service.listTasks(args),
  );
  tool(
    server,
    "get_task",
    "Get task and subtasks by ID or issue key",
    { ...lookupIdentifier, archived: z.boolean().optional() },
    async (args) => {
      const reference = recordReference(args);
      return reference.key
        ? service.getTaskByKey(reference.key, args.archived)
        : service.getTask(reference.id!, args.archived);
    },
  );
  tool(
    server,
    "get_subtask",
    "Get a subtask by ID or issue key",
    lookupIdentifier,
    async (args) => {
      const reference = recordReference(args);
      return service.getSubtask(reference.key ?? reference.id!);
    },
  );
  tool(
    server,
    "create_task",
    "Create task under plan",
    { planId: z.string(), task: taskInput },
    async (args) => service.createTask(args.planId, args.task),
  );
  tool(
    server,
    "update_task",
    "Update task fields",
    {
      id: z.string(),
      ...revision,
      title: z.string().optional(),
      description: z.string().optional(),
      plan: z.string().optional(),
      statusId: z.string().optional(),
      effort: effort.optional(),
    },
    async ({ id, expectedRevision, ...changes }) =>
      service.updateTask(id, expectedRevision, changes),
  );
  tool(
    server,
    "claim_task",
    "Atomically move task to configured start status",
    { id: z.string(), ...revision },
    async (args) => service.claimTask(args.id, args.expectedRevision),
  );
  tool(
    server,
    "plan_task",
    "Save detailed Markdown plan and structured subtasks",
    {
      id: z.string(),
      ...revision,
      plan: z.string(),
      subtasks: z.array(subtaskInput),
      replace: z.boolean().optional(),
    },
    async (args) =>
      service.planTask(
        args.id,
        args.expectedRevision,
        args.plan,
        args.subtasks,
        args.replace,
      ),
  );
  tool(
    server,
    "create_subtask",
    "Create subtask",
    { taskId: z.string(), ...revision, subtask: subtaskInput },
    async (args) =>
      service.createSubtask(args.taskId, args.expectedRevision, args.subtask),
  );
  tool(
    server,
    "update_subtask",
    "Update subtask",
    {
      taskId: z.string(),
      id: z.string(),
      ...revision,
      title: z.string().optional(),
      description: z.string().optional(),
      plan: z.string().optional(),
      statusId: z.string().optional(),
      effort: effort.optional(),
    },
    async ({ taskId, id, expectedRevision, ...changes }) =>
      service.updateSubtask(taskId, id, expectedRevision, changes),
  );
  tool(
    server,
    "move_work_item",
    "Move plan, task, or subtask to workflow status",
    {
      kind: z.enum(["plan", "task", "subtask"]),
      id: z.string(),
      taskId: z.string().optional(),
      statusId: z.string(),
      ...revision,
    },
    async (args) =>
      service.moveWorkItem(
        args.kind,
        args.id,
        args.statusId,
        args.expectedRevision,
        args.taskId,
      ),
  );
  tool(
    server,
    "archive_work_item",
    "Archive task or subtask",
    {
      kind: z.enum(["task", "subtask"]),
      id: z.string(),
      taskId: z.string().optional(),
      ...revision,
    },
    async (args) =>
      service.archiveWorkItem(
        args.kind,
        args.id,
        args.expectedRevision,
        args.taskId,
      ),
  );
  tool(
    server,
    "restore_work_item",
    "Restore task or subtask",
    {
      kind: z.enum(["task", "subtask"]),
      id: z.string(),
      taskId: z.string().optional(),
      ...revision,
    },
    async (args) =>
      service.restoreWorkItem(
        args.kind,
        args.id,
        args.expectedRevision,
        args.taskId,
      ),
  );
  tool(
    server,
    "get_workflow",
    "Get workflow statuses and start status",
    {},
    async () => service.getWorkflow(),
  );
  return server;
}

// SDK callback generics do not preserve dynamic Zod shape inference through this wrapper.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function tool<T extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  shape: T,
  handler: (args: any) => Promise<unknown>,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callback = async (args: any) => {
    try {
      return {
        content: [
          { type: "text", text: JSON.stringify(await handler(args), null, 2) },
        ],
      };
    } catch (error) {
      const data =
        error instanceof TaskdroidError
          ? { code: error.code, message: error.message, details: error.details }
          : {
              code: "INTERNAL_ERROR",
              message: error instanceof Error ? error.message : String(error),
            };
      return {
        isError: true,
        content: [{ type: "text", text: JSON.stringify({ error: data }) }],
      };
    }
  };
  server.registerTool(
    name,
    { description, inputSchema: shape },
    callback as never,
  );
}

function recordReference(args: { id?: string; key?: string }) {
  if (Boolean(args.id) === Boolean(args.key)) {
    throw new TaskdroidError(
      "INVALID_INPUT",
      "Provide exactly one of id or key",
    );
  }
  return args;
}
