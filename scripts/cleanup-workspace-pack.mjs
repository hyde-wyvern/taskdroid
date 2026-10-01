import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { cwd, exit } from "node:process";

const packageDirectory = cwd();
const marker = join(packageDirectory, ".taskdroid-pack-stage.json");
let stagedFiles;

try {
  stagedFiles = JSON.parse(await readFile(marker, "utf8"));
} catch (error) {
  if (error?.code === "ENOENT") exit(0);
  throw error;
}

await Promise.all(
  stagedFiles.map((name) => rm(join(packageDirectory, name), { force: true })),
);
await rm(marker, { force: true });
