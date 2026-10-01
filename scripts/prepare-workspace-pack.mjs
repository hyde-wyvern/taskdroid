import { access, copyFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { cwd } from "node:process";

const packageDirectory = cwd();
const repositoryRoot = resolve(packageDirectory, "../..");
const distDirectory = join(packageDirectory, "dist");
const stagedFiles = [];

await access(distDirectory);

async function removeTestArtifacts(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await removeTestArtifacts(path);
    else if (/\.(test|spec)\./.test(entry.name)) await rm(path);
  }
}

await removeTestArtifacts(distDirectory);

for (const name of ["README.md", "LICENSE"]) {
  const target = join(packageDirectory, name);
  try {
    await access(target);
    continue;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await copyFile(join(repositoryRoot, name), target);
  stagedFiles.push(name);
}

await writeFile(
  join(packageDirectory, ".taskdroid-pack-stage.json"),
  `${JSON.stringify(stagedFiles)}\n`,
  "utf8",
);
