import { TextInput } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import { DetailHeader } from "./DetailHeader";
import { DialogShell, TaskButton } from "./Controls";
import { MarkdownEditor } from "./MarkdownEditor";

export function DocumentEditorDialog({
  initialName,
  initialContent,
  existingNames,
  onClose,
  onSave,
  onDelete,
  onError,
}: {
  initialName?: string;
  initialContent: string;
  existingNames: string[];
  onClose: () => void;
  onSave: (name: string, content: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onError: (error: unknown) => void;
}) {
  const [name, setName] = useState(initialName?.replace(/\.md$/i, "") ?? "");
  const [content, setContent] = useState(initialContent);
  const editing = initialName !== undefined;
  const filename = normalizeFilename(name);
  const duplicate = Boolean(
    filename &&
    existingNames.some(
      (existing) =>
        existing.toLocaleLowerCase() === filename.toLocaleLowerCase() &&
        existing !== initialName,
    ),
  );
  const nameError = !name.trim()
    ? "Document title is required"
    : !filename
      ? "Use letters, numbers, dots, underscores, or hyphens"
      : duplicate
        ? "A document with this title already exists"
        : undefined;
  const title = editing ? "Edit document" : "New document";

  async function save() {
    if (!filename || nameError) return;
    try {
      await onSave(filename, content);
    } catch (error) {
      onError(error);
    }
  }

  async function remove() {
    if (!onDelete || !window.confirm(`Delete ${initialName}?`)) return;
    try {
      await onDelete();
    } catch (error) {
      onError(error);
    }
  }

  return (
    <DialogShell title={title} onClose={onClose} wide>
      <DetailHeader title={title} crumbs={[]} onClose={onClose} />
      <div className="document-editor-form">
        <TextInput
          label="Document title"
          value={name}
          error={nameError}
          onChange={(event) => setName(event.target.value)}
        />
        <MarkdownEditor
          label="Document content (Markdown)"
          value={content}
          onChange={setContent}
          height={360}
        />
      </div>
      <footer>
        {onDelete && (
          <TaskButton
            variant="danger"
            leftSection={<IconTrash size={18} />}
            onClick={() => void remove()}
          >
            Delete document
          </TaskButton>
        )}
        <span />
        <TaskButton onClick={onClose}>Cancel</TaskButton>
        <TaskButton
          variant="primary"
          disabled={Boolean(nameError)}
          onClick={() => void save()}
        >
          Save document
        </TaskButton>
      </footer>
    </DialogShell>
  );
}

function normalizeFilename(title: string) {
  const trimmed = title.trim();
  if (!trimmed || !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(trimmed)) {
    return undefined;
  }
  return `${trimmed}.md`;
}
