# Maintainer and Release Guide

Pull requests and pushes to `main` run GitHub CI. Pushing `v0.1.0` runs the guarded release workflow in `.github/workflows/release.yml`; it validates and publishes the four runtime packages, then creates a GitHub release. Because this is the first publication, the package pages do not yet exist for npm trusted-publisher setup; the workflow requires the `NPM_TOKEN` bootstrap secret.

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

5. Verify npm ownership and public-scope publishing permission for `@culto` before the first publication. Check the signed-in account with `npm whoami --registry=https://registry.npmjs.org/` and confirm its organization role permits publishing. A 404 from a private configured registry does not establish public npm publish permission.

## GitHub and npm permissions

### First publication bootstrap

The packages must exist before npm offers their per-package Trusted Publisher settings. For the initial `v0.1.0` publication, create a granular access token on npmjs.com with **Read and write (publish and stage)** permission restricted to the `@culto` scope or the four package names. Enable **Bypass two-factor authentication** for package publishing if the account or packages require 2FA. Store it as the repository Actions secret `NPM_TOKEN`; the release workflow fails fast if it is missing. `actions/setup-node` configures the npmjs registry and `@culto` scope so `NODE_AUTH_TOKEN` is actually used; do not add an interactive `npm login` step to CI. Never commit or print the token.

### Trusted publishing after bootstrap

After the first publication, configure each package (`@culto/taskdroid-core`, `@culto/taskdroid-server`, `@culto/taskdroid-mcp`, and `@culto/taskdroid`) in npm's package Settings → Trusted publishing: provider GitHub Actions, owner `hyde-wyvern`, repository `taskdroid`, workflow filename `release.yml`, and no GitHub environment. In Allowed actions, explicitly enable direct `npm publish` (not only `npm stage publish`). Repeat for all four packages. The release job grants `id-token: write`, disables package-manager caching, and installs npm 11.5.1 or newer. After a later-version workflow has been verified with OIDC, remove `NPM_TOKEN`. GitHub release creation uses `contents: write`.

The release job runs `scripts/check-packages.mjs` against the tag version before publishing. It publishes core, server, MCP, then CLI, and creates generated release notes/source archives only after all package publishes succeed. The `@culto/taskdroid-web` workspace remains private and is bundled into the CLI.

## Publish and smoke test

For the first release, add `NPM_TOKEN` before pushing `v0.1.0`; the tagged workflow then publishes and creates the GitHub release. Do not manually publish packages and also trigger the automatic release workflow for the same version.

From a clean temporary directory and a Node.js 22+ environment, install the packed runtime tarballs, initialize a project, start the dashboard, and confirm `/` serves the packaged HTML, its hashed JavaScript/CSS assets load, and the API returns the initialized project. Configure an MCP client to launch `taskdroid mcp` with the test project as its working directory, then verify `get_project`, `get_workflow`, and direct `get_plan`, `get_task`, and `get_subtask` lookups by issue key, as well as ID-based mutations with current revisions. Finally run `taskdroid validate` against the clean project.

Do not describe the release as verified until the packed CLI has been tested independently of the monorepo. Record the exact package versions and smoke-test results in the GitHub release notes.
