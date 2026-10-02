# Maintainer and Release Guide

Taskdroid 0.1.0 is published on npm and has a GitHub release. Pull requests and pushes to `main` run GitHub CI. The current `.github/workflows/release.yml` is the one-time `v0.1.0` bootstrap workflow; do not rerun or move that tag. For a later version, bump all public package versions, update the workflow/tag checks and `scripts/check-packages.mjs`, then use OIDC trusted publishing or the documented token fallback.

## Pre-release checks

1. Confirm the intended version and matching versions across publishable workspaces.
2. Confirm the root `LICENSE` matches GNU GPL v3 and that `@culto/taskdroid-core`, `@culto/taskdroid-server`, `@culto/taskdroid-mcp`, and `@culto/taskdroid` declare `GPL-3.0-or-later`, Node.js 22+, synchronized versions, and public npm access metadata. The `@culto/taskdroid-web` workspace must remain private.
3. Run the repository gates:

   ```sh
   npm run validate
   npm run lint
   ```

4. Inspect package contents without publishing:

   ```sh
   npm pack --workspace @culto/taskdroid-core --dry-run
   npm pack --workspace @culto/taskdroid-server --dry-run
   npm pack --workspace @culto/taskdroid-mcp --dry-run
   npm pack --workspace @culto/taskdroid --dry-run
   ```

   `npm run build -w @culto/taskdroid` builds the private web workspace and copies its Vite output to `packages/cli/dist/web`. Confirm the CLI tarball contains `dist/web/index.html` and its referenced assets, declarations, README, and license. Confirm workspace source, project-local data, tests, and development-only files are excluded. The web workspace remains private.

5. Before each future publication, verify npm ownership and public-scope publishing permission for `@culto`. Check the signed-in account with `npm whoami --registry=https://registry.npmjs.org/` and confirm its organization role permits publishing. A 404 from a private configured registry does not establish public npm publish permission.

## GitHub and npm permissions

### Trusted publishing for future releases

All four runtime packages are now published, so npm offers per-package Trusted Publisher settings. For each of `@culto/taskdroid-core`, `@culto/taskdroid-server`, `@culto/taskdroid-mcp`, and `@culto/taskdroid`, select GitHub Actions with owner `hyde-wyvern`, repository `taskdroid`, workflow filename `release.yml`, and no GitHub environment. In Allowed actions, explicitly enable direct `npm publish` (not only `npm stage publish`).

Before relying on OIDC, prepare the next release workflow: bump all public package versions, update its tag/version checks and package checker, retain `id-token: write`, `registry-url: https://registry.npmjs.org/`, and scope `@culto`, then make `NPM_TOKEN` optional or remove the fallback. The current workflow is pinned to the one-time `v0.1.0` release and requires `NPM_TOKEN`; do not reuse that tag. Verify a later-version workflow with OIDC before removing any remaining fallback secret. GitHub release creation uses `contents: write`.

The release job runs `scripts/check-packages.mjs` against the tag version before publishing. It publishes core, server, MCP, then CLI, and creates generated release notes/source archives only after all package publishes succeed. The `@culto/taskdroid-web` workspace remains private and is bundled into the CLI.

## Publish and smoke test

The `v0.1.0` release is complete; do not rerun or republish that tag. For a later version, update the release workflow and package-check version first, configure trusted publishing (or the optional token fallback), then push the new version tag once. Do not manually publish packages and also trigger the automatic release workflow for the same version.

From a clean temporary directory and a Node.js 22+ environment, install the packed runtime tarballs, initialize a project, start the dashboard, and confirm `/` serves the packaged HTML, its hashed JavaScript/CSS assets load, and the API returns the initialized project. Configure an MCP client to launch `taskdroid mcp` with the test project as its working directory, then verify `get_project`, `get_workflow`, and direct `get_plan`, `get_task`, and `get_subtask` lookups by issue key, as well as ID-based mutations with current revisions. Finally run `taskdroid validate` against the clean project.

Do not describe the release as verified until the packed CLI has been tested independently of the monorepo. Record the exact package versions and smoke-test results in the GitHub release notes.
