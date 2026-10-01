import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { resolveWebRoot } from "./webAssets.js";

describe("CLI dashboard assets", () => {
  it("resolves the bundled web directory beside the installed CLI entry point", () => {
    const cliEntry = pathToFileURL(join("/package", "dist", "index.js")).href;
    expect(resolveWebRoot(cliEntry)).toBe(join("/package", "dist", "web"));
  });
});
