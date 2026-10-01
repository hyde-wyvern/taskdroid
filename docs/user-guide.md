# User Guide

Taskdroid keeps plans and day-to-day work in a local project. This guide covers setup and the dashboard. For installation, see the [README](../README.md); for agent operations, see the [Agent and MCP Guide](agent-mcp-guide.md).

## Requirements and setup

Taskdroid requires Node.js 22 or newer. Until the CLI package is published, install it from a source checkout:

```sh
git clone https://github.com/hyde-wyvern/taskdroid.git
cd taskdroid
npm install
npm run build
npm link -w @taskdroid/cli
```

Create a separate project directory, then initialize and open its dashboard:

```sh
mkdir my-project
cd my-project
taskdroid init --name "My project"
taskdroid ui
```

The dashboard is served at `http://127.0.0.1:4317` by default. Use `taskdroid ui --no-open` to avoid opening a browser automatically, or pass `--port <port>` to choose another port. The default host is loopback; avoid binding to a network interface unless you have secured access yourself.

On a browser's first visit to a project, onboarding appears before the requested dashboard view. Continue returns to that view, including direct links. Completion is stored in that browser's local storage under the stable project ID. The logo opens onboarding again at any time.

## Dashboard views

- **Board** focuses on active work and excludes Backlog.
- **List** shows plans, tasks, and subtasks together.
- **Project** manages plans and project Markdown documents.
- **Settings** configures workflow statuses and the status used when claiming a task.

Use search and status filters to narrow visible work. A plan's progress is based on completed active leaf effort. A task owns its effort until it has active subtasks; then its effort is the sum of those subtasks.

## Working with plans and tasks

Create a plan for an outcome and add its high-level tasks. Keep task status independent from plan status. When a task needs smaller steps, write a detailed plan and split it into subtasks. Subtasks are the leaves of the hierarchy; nesting stops there. Archive removes an item from active views without deleting its record, and restore brings it back.

Plans, tasks, and subtasks receive unique project-wide issue keys. Agents can fetch any of them directly by key with the MCP getters described in the [Agent and MCP Guide](agent-mcp-guide.md).

Use the Project view to edit `description.md`, `architecture.md`, and `agents.md`. These documents belong to this project and are distinct from the repository's root `AGENTS.md`.

## Local data and backups

Project data lives under `.taskdroid/` as human-readable JSON and Markdown. Taskdroid has no hosted service, account, database, or cloud sync. The dashboard binds to loopback by default; the MCP server communicates over the local client's stdio connection. Neither interface provides authentication for a deliberately exposed network listener.

To back up a project, stop Taskdroid processes that may be writing to it and copy `.taskdroid/` using your normal backup tool. Keep secrets out of project documents and do not commit project data unless you intend to share it. Run `taskdroid validate` to check the local data.
