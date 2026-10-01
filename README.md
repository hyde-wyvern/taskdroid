# Taskdroid

Taskdroid is local-first planning and work tracking for people and AI agents. It organizes work as **Project → Plan → Task → Subtask**, with a browser dashboard and a stdio MCP server over the same project data.

Taskdroid 0.1.0 is a pre-1.0 preview. Expect changes; stable schema and API compatibility are not promised.

## Who it is for

- **Project owners** who want a local dashboard for plans, tasks, workflow, and project notes.
- **AI agents** that need structured work context and revision-safe MCP tools.
- **Contributors and maintainers** building and releasing the npm workspace.

## Requirements and installation

Node.js 22 or newer is required. The CLI is not published to npm yet. For now, install it from the source repository:

```sh
git clone https://github.com/hyde-wyvern/taskdroid.git
cd taskdroid
npm install
npm run build
npm link -w @taskdroid/cli
```

Once the package is published, the intended install command is:

```sh
npm install --global @taskdroid/cli
```

## Quick start

From a directory outside the source checkout, create a project of its own, then initialize it and start the dashboard:

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

The intended license is [GNU GPL v3.0 or later](https://www.gnu.org/licenses/gpl-3.0.html). This source snapshot does not yet include a root `LICENSE` file; add and verify the license artifact before publishing a release.
