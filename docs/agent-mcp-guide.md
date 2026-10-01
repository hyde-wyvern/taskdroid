# Agent and MCP Guide

Taskdroid exposes the current local project through an MCP server over stdio. For human setup and dashboard use, see the [User Guide](user-guide.md).

## Configure an MCP client

Initialize the project once with `taskdroid init`. Configure your MCP client to start `taskdroid mcp` with that project as its working directory. Configuration files vary by client; a common shape is:

```json
{
  "mcpServers": {
    "taskdroid": {
      "command": "taskdroid",
      "args": ["mcp"],
      "cwd": "/absolute/path/to/my-project"
    }
  }
}
```

Use the absolute path to the project containing `.taskdroid/project.json`. Project discovery can also walk upward from a subdirectory. The MCP server is local and does not require a hosted account.

## Recommended workflow

1. Call `get_project` and `get_workflow` to understand the project, active plans, progress, and statuses.
2. Call `list_documents`, then read `agents.md` and `architecture.md` with `get_document` when present. Follow project instructions.
3. Use `list_plans` and `get_plan` to find the relevant plan, then `list_tasks` or `get_task` to inspect its work.
4. Claim a task with `claim_task`, passing its current `expectedRevision`. The task moves to the configured workflow start status.
5. For work that needs slicing, use `plan_task` with a detailed Markdown plan and structured subtasks. Keep task effort equal to the sum of active subtask effort.
6. Use the update or move tools as work proceeds. Re-fetch after a revision conflict and never overwrite a newer revision.
7. Move completed work to the project's review status; do not assume a status ID that is not in the current workflow.

Mutations require the current `expectedRevision`. Task and plan status are independent from child status. Archiving is soft deletion; use the matching restore tool when needed. Never edit `.taskdroid/` JSON directly.

## Tool reference

Names below match the server registrations in `packages/mcp/src/index.ts`.

- Project and workflow: `get_project`, `get_workflow`
- Documents: `list_documents`, `get_document`, `update_document`
- Plans: `list_plans`, `get_plan`, `create_plan`, `update_plan`, `archive_plan`, `restore_plan`
- Tasks: `list_tasks`, `get_task`, `create_task`, `update_task`, `claim_task`, `plan_task`
- Subtasks: `create_subtask`, `update_subtask`
- General work-item operations: `move_work_item`, `archive_work_item`, `restore_work_item`

For a document or work-item mutation, read the latest record first and pass its revision. `claim_task` and `plan_task` also require `expectedRevision`. `plan_task` replaces the active subtask set by default; set `replace` to `false` only when appending is intended.
