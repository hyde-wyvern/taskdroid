# Taskdroid

<p align="center">
  <img src="public/logo.svg" alt="Taskdroid logo" width="180">
</p>
<p align="center">Local-first planning for people and AI agents</p>

[![npm version](https://img.shields.io/npm/v/%40culto%2Ftaskdroid)](https://www.npmjs.com/package/@culto/taskdroid)
[![npm downloads](https://img.shields.io/npm/dm/%40culto%2Ftaskdroid)](https://www.npmjs.com/package/@culto/taskdroid)
[![CI](https://github.com/hyde-wyvern/taskdroid/actions/workflows/ci.yml/badge.svg)](https://github.com/hyde-wyvern/taskdroid/actions/workflows/ci.yml)
[![License](https://img.shields.io/npm/l/%40culto%2Ftaskdroid)](https://github.com/hyde-wyvern/taskdroid/blob/main/LICENSE)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

Organize work as **Project → Plan → Task → Subtask**, with a browser dashboard and a stdio MCP server over the same project data.

Taskdroid 0.1.1 is a pre-1.0 preview. Expect changes; stable schema and API compatibility are not promised.

## Who it is for

- **Project owners** who want a local dashboard for plans, tasks, workflow, and project notes.
- **AI agents** that need structured work context, direct plan/task/subtask lookup by issue key, and revision-safe MCP tools.
- **Contributors and maintainers** building and releasing the npm workspace.

## Requirements and installation

Node.js 22 or newer is required. Install the published CLI from the public npm registry:

```sh
npm install --global @culto/taskdroid --registry=https://registry.npmjs.org/
```

## Quick start

From the directory you want to use for your project, initialize it and start the dashboard:

```sh
mkdir my-project
cd my-project
taskdroid init --name "My project"
taskdroid ui
```

The dashboard opens at `http://127.0.0.1:4317` by default. Run `taskdroid mcp` from the project directory to connect an MCP client over stdio. See the [User Guide](docs/user-guide.md) and [Agent and MCP Guide](docs/agent-mcp-guide.md) for setup and workflows.

## Commands

- `taskdroid init [--name <name>] [--manage-agent-instructions]` initializes the current directory; interactive use may offer to manage its root `AGENTS.md`.
- `taskdroid ui [--host <host>] [--port <port>] [--no-open]` serves the dashboard (defaults: `127.0.0.1:4317`).
- `taskdroid mcp` runs the stdio MCP server.
- `taskdroid validate` validates the current project's local data.

## Local data and security

Project data lives in `.taskdroid/` as human-readable JSON and Markdown. Taskdroid has no hosted service, account, database, or cloud sync. The dashboard defaults to loopback; changing its host changes who may be able to reach it. The MCP server uses the local client's stdio connection. Neither interface should be given secrets or exposed beyond trusted users without additional protections.

## Guides and support

- [User Guide](docs/user-guide.md)
- [Agent and MCP Guide](docs/agent-mcp-guide.md)
- [Developer and Contribution Guide](docs/developer-guide.md)
- [Maintainer and Release Guide](docs/maintainer-guide.md)

Report bugs and request features in [GitHub Issues](https://github.com/hyde-wyvern/taskdroid/issues). Contributions should follow the [Developer and Contribution Guide](docs/developer-guide.md).

## License

Taskdroid is licensed under [GNU GPL v3.0 or later](LICENSE). Runtime package manifests declare `GPL-3.0-or-later`; each package tarball includes the license text.
