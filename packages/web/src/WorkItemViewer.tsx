import type { ReactNode } from "react";
import { DetailHeader } from "./DetailHeader";
import type { Crumb } from "./Breadcrumbs";
import { DialogShell, ProgressBar, TaskButton } from "./Controls";

type TextSection = { label: string; value: string; empty: string };
type Progress = {
  percentage: number;
  completedEffort: number;
  totalEffort: number;
  label: string;
  ariaLabel: string;
};

export function WorkItemViewer({
  title,
  closed,
  crumbs,
  status,
  progress,
  description,
  plan,
  childSection,
  leadingAction,
  onEdit,
  editLabel = "Edit",
  onClose,
}: {
  title: string;
  closed?: boolean;
  crumbs: Crumb[];
  status: ReactNode;
  progress: Progress;
  description: TextSection;
  plan: TextSection;
  childSection?: { label: string; content: ReactNode };
  leadingAction?: ReactNode;
  onEdit?: () => void;
  editLabel?: string;
  onClose: () => void;
}) {
  return (
    <DialogShell title={title} onClose={onClose} wide>
      <DetailHeader
        title={title}
        titleClassName={closed ? "closed-title" : undefined}
        crumbs={crumbs}
        onClose={onClose}
      />
      <div className="details-view">
        <div className="viewer-status">{status}</div>
        <section className="task-progress">
          <b>Progress</b>
          <div className="task-progress-heading">
            <span>{progress.percentage}% complete</span>
            <small>
              {progress.completedEffort}/{progress.totalEffort} {progress.label}
            </small>
          </div>
          <ProgressBar
            className="taskdroid-progress-track"
            value={progress.percentage}
            label={progress.ariaLabel}
          />
        </section>
        <section>
          <b>{description.label}</b>
          <p>{description.value || description.empty}</p>
        </section>
        <section>
          <b>{plan.label}</b>
          <pre>{plan.value || plan.empty}</pre>
        </section>
        {childSection && (
          <section>
            <b>{childSection.label}</b>
            {childSection.content}
          </section>
        )}
      </div>
      <footer>
        {leadingAction}
        <span />
        <TaskButton onClick={onClose}>Close</TaskButton>
        {onEdit && (
          <TaskButton variant="primary" aria-label={editLabel} onClick={onEdit}>
            Edit
          </TaskButton>
        )}
      </footer>
    </DialogShell>
  );
}
