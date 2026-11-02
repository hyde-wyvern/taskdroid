import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TaskdroidError, TaskdroidService } from "@culto/taskdroid-core";
import { resolveProjectRoot } from "./projectSelection.js";

const roots: string[] = [];

afterEach(async () =>
  Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  ),
);

async function tempRoot() {
  const root = await mkdtemp(join(tmpdir(), "taskdroid-cli-project-"));
  roots.push(root);
  return root;
}

async function initProject(root: string, name: string) {
  await TaskdroidService.initialize(root, name);
}

describe("MCP project selection", () => {
  it("preserves cwd upward discovery when no directory is supplied", async () => {
    const root = await tempRoot();
    const nested = join(root, "nested", "child");
    await mkdir(nested, { recursive: true });
    await initProject(root, "Default project");

    await expect(resolveProjectRoot(undefined, nested)).resolves.toBe(root);
  });

  it("selects an absolute project path when invoked from another project", async () => {
    const parent = await tempRoot();
    const cwd = join(parent, "cwd");
    const selected = join(parent, "selected");
    await mkdir(cwd);
    await mkdir(selected);
    await initProject(cwd, "Invocation project");
    await initProject(selected, "Selected project");

    await expect(resolveProjectRoot(selected, cwd)).resolves.toBe(selected);
  });

  it("resolves a relative path against the invocation directory", async () => {
    const parent = await tempRoot();
    const cwd = join(parent, "caller");
    const selected = join(parent, "project");
    await mkdir(cwd);
    await mkdir(selected);
    await initProject(selected, "Relative project");

    await expect(resolveProjectRoot("../project", cwd)).resolves.toBe(selected);
  });

  it("allows upward discovery from an existing nested directory", async () => {
    const root = await tempRoot();
    const nested = join(root, "nested");
    await mkdir(nested);
    await initProject(root, "Nested project");

    await expect(resolveProjectRoot(nested, tmpdir())).resolves.toBe(root);
  });

  it("fails clearly for missing paths and file paths without initializing data", async () => {
    const root = await tempRoot();
    const file = join(root, "project.txt");
    await writeFile(file, "not a directory");

    await expect(resolveProjectRoot("missing", root)).rejects.toMatchObject({
      code: "PROJECT_NOT_FOUND",
      message: expect.stringContaining("Project directory does not exist"),
    });
    await expect(resolveProjectRoot(file, root)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: expect.stringContaining("Project path is not a directory"),
    });
  });

  it("does not initialize an existing directory without a Taskdroid project", async () => {
    const root = await tempRoot();

    const error = await resolveProjectRoot(root).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TaskdroidError);
    expect(error).toMatchObject({ code: "PROJECT_NOT_FOUND" });
    await expect(resolveProjectRoot(root)).rejects.toThrow(
      `No Taskdroid project found from directory: ${root}`,
    );
  });
});
