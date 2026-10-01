import { rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";

export const managedAgentInstructions = `# Taskdroid project context

This project uses Taskdroid.

At session start, when Taskdroid MCP is available:

1. Call \`list_documents\`.
2. Read \`agents.md\` and \`architecture.md\` with \`get_document\`.
3. Use issue keys with \`get_plan\`, \`get_task\`, and \`get_subtask\` to fetch work items directly.
4. Follow these project-specific instructions.

Getters accept one \`id\` or \`key\`; mutations require IDs and current \`expectedRevision\` values. Do not edit \`.taskdroid/\` JSON directly. Use Taskdroid MCP tools for work items and project documents.
`;

export async function confirmManagedInstructions(): Promise<boolean> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await prompt.question(
      "Manage root AGENTS.md with Taskdroid? Existing file will be replaced. [y/N] ",
    );
    return ["y", "yes"].includes(answer.trim().toLowerCase());
  } finally {
    prompt.close();
  }
}

export async function writeManagedInstructions(
  projectRoot: string,
): Promise<void> {
  const target = join(projectRoot, "AGENTS.md");
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, managedAgentInstructions, "utf8");
  await rename(temporary, target);
}
