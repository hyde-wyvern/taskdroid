# Maintainer and Release Guide

This guide records the manual preview release gates for Taskdroid. There is no automated release script in the repository. Run the gates from the repository root and publish only after the artifacts have been inspected.

## Pre-release checks

1. Confirm the intended version and matching versions across publishable workspaces.
2. Confirm that a root `LICENSE` file exists and that every published package declares the intended `GPL-3.0-or-later` license. The source snapshot may not yet contain those release artifacts.
3. Run the repository gates:

   ```sh
   npm run validate
   npm run lint
   ```

4. Inspect package contents without publishing:

   ```sh
   npm pack --workspace @taskdroid/core --dry-run
   npm pack --workspace @taskdroid/server --dry-run
   npm pack --workspace @taskdroid/mcp --dry-run
   npm pack --workspace @taskdroid/cli --dry-run
   ```

   `npm run build -w @taskdroid/cli` builds the private web workspace and copies its Vite output to `packages/cli/dist/web`. Confirm the CLI tarball contains `dist/web/index.html` and its referenced assets, declarations, README, and license. Confirm workspace source, project-local data, tests, and development-only files are excluded. The web workspace remains private.

5. Verify npm ownership and public-scope publishing permission for `@taskdroid` before the first publication. Confirm the target package names and registry state with `npm view`.

## Publish and smoke test

Publish the runtime packages in dependency order: core, server and MCP, then CLI. Publish scoped packages publicly when required by the npm account configuration. Create a version tag and GitHub release only after registry artifacts are available.

From a clean temporary directory and a Node.js 22+ environment, install the packed runtime tarballs, initialize a project, start the dashboard, and confirm `/` serves the packaged HTML, its hashed JavaScript/CSS assets load, and the API returns the initialized project. Configure an MCP client to launch `taskdroid mcp` with the test project as its working directory, then verify `get_project`, `get_workflow`, and direct `get_plan`, `get_task`, and `get_subtask` lookups by issue key, as well as ID-based mutations with current revisions. Finally run `taskdroid validate` against the clean project.

Do not describe the release as verified until the packed CLI has been tested independently of the monorepo. Record the exact package versions and smoke-test results in the GitHub release notes.
