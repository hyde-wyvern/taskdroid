# Taskdroid

Taskdroid is a local-first planning and work-tracking tool for AI agents. It has no cloud service, account, database, daemon, or embedded LLM. A project stores its data in `.taskdroid/`, exposes a stdio MCP server, and optionally serves a loopback-only React dashboard.

## Architecture

This npm workspace requires Node.js 22+.

- `packages/core`: Zod schemas, workflow rules, effort/progress calculation, JSON storage, locking, and `TaskdroidService`.
- `packages/cli`: `taskdroid init`, `ui`, `mcp`, and `validate` commands.
- `packages/mcp`: stdio MCP tools backed only by `TaskdroidService`.
- `packages/server`: Express HTTP API and dashboard host.
- `packages/web`: React/Vite dashboard. Keep components small and reuse existing controls/layout primitives.

The domain hierarchy is `Project -> Plan -> Task -> Subtask`. Do not reintroduce legacy `Epic` names, fields, routes, or storage paths.

## Persistent data contract

```text
.taskdroid/
  project.json
  workflow.json
  plans/<plan-id>.json
  tasks/<task-id>.json
  archive/plans/<plan-id>.json
  archive/tasks/<task-id>.json
  docs/*.md
```

`Task.planId` links a task to its plan. Subtasks remain embedded in their parent task record. Records have UUID IDs, non-reusable Jira-style project keys, timestamps, revisions, and `schemaVersion: 1`.

Storage writes use a temporary file plus rename and mutations run under a cross-process lock. Every mutation takes an expected revision; stale updates must return `REVISION_CONFLICT`, never overwrite data. This v1 schema intentionally has no backward compatibility layer: fail safely on unsupported data rather than silently migrating it.

## Domain rules

- Workflow starts with fixed `Backlog` and ends with fixed `Closed`. Only middle statuses are editable. `Closed` is always complete; `Backlog` never is.
- Tasks and subtasks use integer effort from 0 through 100. An unsliced task owns its effort. Once active subtasks exist, its effort equals their active effort sum.
- Plan progress is completed active leaf effort divided by total active leaf effort. Zero total effort is 0%.
- Plan and task statuses are independent from child status. Archiving is soft deletion and restoration uses prior valid status or Backlog.
- Plans, tasks, and subtasks share the monotonic project issue-key sequence. Never reuse keys, including after archiving.

## Interfaces

- HTTP plans: `/api/plans`; task payloads and filters use `planId`.
- MCP tools use `*_plan` names, including `list_plans`, `get_plan`, `create_plan`, `update_plan`, `archive_plan`, and `restore_plan`.
- `taskdroid ui` hosts one discovered project. Project discovery walks upward until `.taskdroid/project.json` exists.

## Dashboard behavior

Board excludes Backlog. List shows all hierarchy levels. Project view owns project Markdown docs. Shared filter state supports fuzzy search, plan selection where applicable, status filtering, and aggregate visible progress. Keep viewer and editor states distinct: edits are drafted and save atomically; archive/restore is immediate.

## Development

Run before handoff:

```sh
npm run typecheck
npm test
npm run lint
npm run build
```

Use `npm run validate` for the normal release gate. The HTTP integration test binds a local ephemeral port; sandboxed environments may require permission for that test.

Keep changes scoped, preserve revisions/locking/validation, and add or update focused tests whenever domain or API behavior changes.
