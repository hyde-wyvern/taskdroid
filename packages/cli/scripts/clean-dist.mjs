import { rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
await Promise.all([
  rm(join(packageDirectory, "dist"), { recursive: true, force: true }),
  rm(join(packageDirectory, "tsconfig.tsbuildinfo"), { force: true }),
]);
