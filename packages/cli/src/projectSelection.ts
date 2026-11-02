import { stat } from "node:fs/promises";
import { resolve } from "node:path";
import { findProjectRoot, TaskdroidError } from "@culto/taskdroid-core";

export async function resolveProjectRoot(
  projectDirectory?: string,
  cwd = process.cwd(),
): Promise<string> {
  if (projectDirectory === undefined) return findProjectRoot(cwd);

  const directory = resolve(cwd, projectDirectory);
  let metadata;
  try {
    metadata = await stat(directory);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR")
      throw new TaskdroidError(
        "PROJECT_NOT_FOUND",
        `Project directory does not exist: ${directory}`,
      );
    throw error;
  }

  if (!metadata.isDirectory())
    throw new TaskdroidError(
      "INVALID_INPUT",
      `Project path is not a directory: ${directory}`,
    );

  try {
    return await findProjectRoot(directory);
  } catch (error) {
    if (error instanceof TaskdroidError && error.code === "PROJECT_NOT_FOUND")
      throw new TaskdroidError(
        "PROJECT_NOT_FOUND",
        `No Taskdroid project found from directory: ${directory}`,
      );
    throw error;
  }
}
