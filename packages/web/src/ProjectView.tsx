import { useEffect, useState } from "react";
import { IconPencil } from "@tabler/icons-react";
import { PlansView } from "./PlansView";
import { MarkdownContent } from "./MarkdownContent";
import { DocumentEditorDialog } from "./DocumentEditorDialog";
import { IconAction } from "./Controls";
import type { Plan, Project, Workflow } from "./types";

type DocumentDialogState = { mode: "create" } | { mode: "edit"; name: string };

export function ProjectView({
  project,
  plans,
  workflow,
  onSelect,
  onCreate,
  onMove,
  onSave,
  onError,
  activeDocumentName,
  onDocumentChange,
}: {
  project: Project;
  plans: Plan[];
  workflow: Workflow;
  onSelect: (plan: Plan) => void;
  onCreate: () => void;
  onMove: (plan: Plan, statusId: string) => Promise<void>;
  onSave: (documents: Project["documents"]) => Promise<void>;
  onError: (error: unknown) => void;
  activeDocumentName?: string;
  onDocumentChange?: (name?: string) => void;
}) {
  const [documents, setDocuments] = useState(project.documents);
  const [active, setActive] = useState(activeDocumentName ?? "description.md");
  const [documentDialog, setDocumentDialog] =
    useState<DocumentDialogState | null>(null);
  const names = Object.keys(documents);
  const current = documents[active] ?? "";
  useEffect(() => {
    setDocuments(project.documents);
    setActive((current) => {
      if (
        activeDocumentName &&
        project.documents[activeDocumentName] !== undefined
      ) {
        return activeDocumentName;
      }
      return project.documents[current] === undefined
        ? (Object.keys(project.documents)[0] ?? "")
        : current;
    });
  }, [activeDocumentName, project.documents]);
  function selectDocument(name: string) {
    setActive(name);
    onDocumentChange?.(name);
  }
  async function deleteDocument(name: string) {
    const next = { ...documents };
    delete next[name];
    await onSave(next);
    setDocuments(next);
    const nextActive = Object.keys(next).sort()[0] ?? "";
    setActive(nextActive);
    onDocumentChange?.(nextActive || undefined);
    setDocumentDialog(null);
  }
  return (
    <section className="project-view">
      <div className="view-heading">
        <div>
          <h2>{project.name}</h2>
        </div>
      </div>
      <div className="project-workspace">
        <section
          className="project-documents-pane"
          aria-label="Project documents"
        >
          <div className="document-tabs" role="tablist">
            {names.map((name) => (
              <div
                className={`document-tab-item${active === name ? " active" : ""}`}
                key={name}
              >
                <button
                  role="tab"
                  aria-selected={active === name}
                  onClick={() => selectDocument(name)}
                >
                  {name}
                </button>
                {active === name && (
                  <IconAction
                    label="Edit document"
                    icon={<IconPencil size={16} />}
                    onClick={() => setDocumentDialog({ mode: "edit", name })}
                  />
                )}
              </div>
            ))}
            <button
              className="primary add-tab"
              onClick={() => setDocumentDialog({ mode: "create" })}
              aria-label="Add document"
            >
              +
            </button>
          </div>
          {active && (
            <div className="project-document">
              {current ? (
                <MarkdownContent content={current} />
              ) : (
                <p>Empty document</p>
              )}
            </div>
          )}
        </section>
        <aside className="project-plans-rail" aria-label="Project plans">
          <PlansView
            plans={plans}
            workflow={workflow}
            onSelect={onSelect}
            onCreate={onCreate}
            onMove={onMove}
          />
        </aside>
      </div>
      {documentDialog && (
        <DocumentEditorDialog
          initialName={
            documentDialog.mode === "edit" ? documentDialog.name : undefined
          }
          initialContent={
            documentDialog.mode === "edit"
              ? (documents[documentDialog.name] ?? "")
              : ""
          }
          existingNames={names}
          onClose={() => setDocumentDialog(null)}
          onSave={async (name, content) => {
            const next = { ...documents };
            if (documentDialog.mode === "edit") {
              delete next[documentDialog.name];
            }
            next[name] = content;
            await onSave(next);
            setDocuments(next);
            setActive(name);
            onDocumentChange?.(name);
            setDocumentDialog(null);
          }}
          onDelete={
            documentDialog.mode === "edit"
              ? () => deleteDocument(documentDialog.name)
              : undefined
          }
          onError={onError}
        />
      )}
    </section>
  );
}
