import { execFileSync } from "node:child_process";
import { log } from "node:console";
import { readFile } from "node:fs/promises";
import { argv } from "node:process";

const packages = [
  { name: "@culto/taskdroid-core", directory: "packages/core" },
  { name: "@culto/taskdroid-server", directory: "packages/server" },
  { name: "@culto/taskdroid-mcp", directory: "packages/mcp" },
  { name: "@culto/taskdroid", directory: "packages/cli", cli: true },
];
const cliManifest = JSON.parse(
  await readFile("packages/cli/package.json", "utf8"),
);
const releaseTag = argv[2];
if (releaseTag && releaseTag !== `v${cliManifest.version}`) {
  throw new Error(
    `Tag ${releaseTag} does not match CLI version ${cliManifest.version}`,
  );
}

const checked = [];
for (const item of packages) {
  const manifest = JSON.parse(
    await readFile(`${item.directory}/package.json`, "utf8"),
  );
  if (manifest.name !== item.name) {
    throw new Error(
      `${item.directory}: expected ${item.name}, found ${manifest.name}`,
    );
  }
  if (
    manifest.version !== cliManifest.version ||
    manifest.version !== "0.1.0"
  ) {
    throw new Error(
      `${item.name}: release version must match ${cliManifest.version} and v0.1.0`,
    );
  }
  if (
    manifest.license !== "GPL-3.0-or-later" ||
    manifest.engines?.node !== ">=22"
  ) {
    throw new Error(
      `${item.name}: expected GPL-3.0-or-later and Node.js >=22 metadata`,
    );
  }
  if (manifest.publishConfig?.access !== "public") {
    throw new Error(`${item.name}: npm publish access must be public`);
  }

  const output = execFileSync(
    "npm",
    ["pack", "--workspace", item.name, "--dry-run", "--json"],
    { encoding: "utf8" },
  );
  const jsonStart = output.indexOf("[\n  {");
  if (jsonStart < 0)
    throw new Error(`${item.name}: npm pack did not return JSON`);
  const pack = JSON.parse(output.slice(jsonStart))[0];
  const paths = pack.files.map((file) => file.path);
  const missing = ["README.md", "LICENSE", "dist/index.js"].filter(
    (path) => !paths.includes(path),
  );
  const excluded = paths.filter(
    (path) => path.startsWith("src/") || /\.(test|spec)\./.test(path),
  );
  if (missing.length || excluded.length) {
    throw new Error(
      `${item.name}: missing ${missing.join(", ") || "none"}; included forbidden ${excluded.join(", ") || "none"}`,
    );
  }
  if (
    item.cli &&
    (!paths.includes("dist/web/index.html") ||
      !paths.some(
        (path) => path.startsWith("dist/web/assets/") && path.endsWith(".js"),
      ) ||
      !paths.some(
        (path) => path.startsWith("dist/web/assets/") && path.endsWith(".css"),
      ))
  ) {
    throw new Error(
      `${item.name}: bundled dashboard HTML, JS, or CSS is missing`,
    );
  }
  checked.push({ name: item.name, version: pack.version, files: paths.length });
}

const web = JSON.parse(await readFile("packages/web/package.json", "utf8"));
if (web.private !== true)
  throw new Error("@culto/taskdroid-web must remain private");
log(JSON.stringify({ releaseTag: releaseTag ?? null, checked }, null, 2));
