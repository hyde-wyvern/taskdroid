# Developer and Contribution Guide

Taskdroid is an npm workspace for a local-first planning tool. The [README](../README.md) is the product entry point; this guide covers building and contributing to the repository.

## Requirements

- Node.js 22 or newer
- npm

## Workspace layout

- `packages/core`: schemas, workflow rules, effort/progress calculations, JSON storage, locking, and `TaskdroidService`.
- `packages/cli`: the `taskdroid` command-line interface; its build packages the dashboard under `dist/web`.
- `packages/mcp`: stdio MCP tools backed by the core service.
- `packages/server`: the HTTP API and dashboard host.
- `packages/web`: the React/Vite dashboard.

The domain hierarchy is Project → Plan → Task → Subtask. Project-local records live in `.taskdroid/`; do not add project fixtures or generated data to the repository.

Core getters preserve ID-based access and also resolve plans and tasks by their issue keys. Subtasks are embedded in tasks but are directly retrievable by ID or key through the service and MCP `get_subtask` tool.

## Develop and verify

From the repository root:

```sh
npm install
npm run typecheck
npm test
npm run lint
npm run build
```

`npm run validate` runs typecheck, tests, and build. Lint is a separate gate, so run `npm run lint` as well. The web workspace can be built independently with `npm run build -w @taskdroid/web`.

`npm run build -w @taskdroid/cli` builds the private web workspace, compiles the CLI, then copies the Vite output into `packages/cli/dist/web`. The CLI package publishes `dist` only; keep dashboard source and the separate `@taskdroid/web` workspace private.

Keep changes scoped to the owning package. Add focused tests for domain, API, and dashboard behavior. Preserve revision checks, cross-process locking, schema validation, and atomic storage writes. Do not edit `.taskdroid/` JSON directly when working in a Taskdroid project; use the service or MCP tools.

## Contribute

For a bug or proposed change, search existing [issues](https://github.com/hyde-wyvern/taskdroid/issues) first. Open an issue to discuss larger changes, then submit a focused pull request with the relevant tests and verification results. Avoid including local project data, secrets, build output, or unrelated formatting changes.

The configured upstream repository is [hyde-wyvern/taskdroid](https://github.com/hyde-wyvern/taskdroid).
