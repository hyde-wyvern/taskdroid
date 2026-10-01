import { fileURLToPath } from "node:url";

export function resolveWebRoot(moduleUrl: string): string {
  return fileURLToPath(new URL("./web", moduleUrl));
}
