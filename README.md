# Taskdroid

Local task planning and tracking for AI agents. Taskdroid stores project data in human-readable JSON, exposes an MCP server, and serves a local Kanban dashboard.

## Development

```sh
npm install
npm run validate
npm link -w @taskdroid/cli
taskdroid init --name "My project"
taskdroid ui
```

Configure an MCP client to run `taskdroid mcp` with the project as its working directory.

## Commands

- `taskdroid init [--name] [--manage-agent-instructions]` (interactive prompt in a terminal)
- `taskdroid ui [--host 127.0.0.1] [--port 4317]`
- `taskdroid mcp`
- `taskdroid validate`

During interactive initialization, Taskdroid can manage root `AGENTS.md`. It tells agents to retrieve `.taskdroid/docs/AGENTS.md` with the focused MCP document tools: `list_documents`, `get_document`, and `update_document`.
