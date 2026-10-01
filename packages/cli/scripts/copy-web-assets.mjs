import { access, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webDirectory = join(scriptDirectory, "../../web/dist");
const cliDistDirectory = join(scriptDirectory, "../dist");
const bundledWebDirectory = join(cliDistDirectory, "web");

await access(join(webDirectory, "index.html"));
await mkdir(cliDistDirectory, { recursive: true });
await rm(bundledWebDirectory, { recursive: true, force: true });
await cp(webDirectory, bundledWebDirectory, { recursive: true });
