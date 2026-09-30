import type { Plan, Progress, Workflow } from "./types";
import { ProgressBar } from "./Controls";

type StatusSelection = string[] | null;
export type WorkFilterValues = {
  search: string;
  planStatusIds: StatusSelection;
  taskStatusIds: StatusSelection;
  subtaskStatusIds: StatusSelection;
};

export function WorkFilters({
  plans,
  planId,
  workflow,
  progress,
  values,
  onPlanChange,
  onChange,
  onClear,
  projectOnly = false,
}: {
  plans: Plan[];
  planId: string;
  workflow: Workflow;
  progress: Progress;
  values: WorkFilterValues;
  onPlanChange: (planId: string) => void;
  onChange: (values: WorkFilterValues) => void;
  onClear: () => void;
  projectOnly?: boolean;
}) {
  return (
    <section className="work-filters" aria-label="Work filters">
      <div className="work-filter-controls">
        <input
          className="search-filter"
          type="search"
          placeholder="Search work"
          aria-label="Search work"
          value={values.search}
          onChange={(event) =>
            onChange({ ...values, search: event.target.value })
          }
        />
        {!projectOnly && (
          <select
            className="select-arrow plan-filter"
            value={planId}
            onChange={(event) => onPlanChange(event.target.value)}
            aria-label="Plan filter"
          >
            <option value="">All plans</option>
            {plans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        )}
        <StatusFilter
          workflow={workflow}
          values={values}
          onChange={onChange}
          projectOnly={projectOnly}
        />
        <button className="clear-filters" onClick={onClear}>
          Clear filters
        </button>
      </div>
      <div className="filter-progress">
        <ProgressBar
          className="filter-progress-bar"
          size={8}
          value={progress.percentage}
          label="Visible work progress"
        />
        <small>
          {progress.percentage}% - {progress.completedEffort}/
          {progress.totalEffort} points
        </small>
      </div>
    </section>
  );
}

function StatusFilter({
  workflow,
  values,
  onChange,
  projectOnly,
}: {
  workflow: Workflow;
  values: WorkFilterValues;
  onChange: (values: WorkFilterValues) => void;
  projectOnly: boolean;
}) {
  const levels = projectOnly
    ? [{ label: "Plans", key: "planStatusIds" as const }]
    : [
        { label: "Plans", key: "planStatusIds" as const },
        { label: "Tasks", key: "taskStatusIds" as const },
        { label: "Subtasks", key: "subtaskStatusIds" as const },
      ];
  function update(
    key: "planStatusIds" | "taskStatusIds" | "subtaskStatusIds",
    statusId: string,
  ) {
    const selected =
      values[key] ?? workflow.statuses.map((status) => status.id);
    const next = selected.includes(statusId)
      ? selected.filter((id) => id !== statusId)
      : [...selected, statusId];
    onChange({
      ...values,
      [key]: next.length === workflow.statuses.length ? null : next,
    });
  }
  function selectAll(
    key: "planStatusIds" | "taskStatusIds" | "subtaskStatusIds",
  ) {
    onChange({ ...values, [key]: null });
  }
  const activeCount = levels.reduce(
    (total, { key }) =>
      total + (values[key]?.length ?? workflow.statuses.length),
    0,
  );
  const allCount = workflow.statuses.length * levels.length;
  return (
    <details className="status-filter">
      <summary aria-label="Status filter">
        Status:{" "}
        {activeCount === allCount ? "All" : `${activeCount}/${allCount}`}
      </summary>
      <div className="status-filter-menu">
        {levels.map(({ label, key }) => (
          <fieldset key={key}>
            <legend>
              {label}
              <button type="button" onClick={() => selectAll(key)}>
                All
              </button>
            </legend>
            {workflow.statuses.map((status) => (
              <label key={status.id}>
                <input
                  type="checkbox"
                  checked={
                    values[key] === null || values[key].includes(status.id)
                  }
                  onChange={() => update(key, status.id)}
                />
                {status.name}
              </label>
            ))}
          </fieldset>
        ))}
      </div>
    </details>
  );
}
