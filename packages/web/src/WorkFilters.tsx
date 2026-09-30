import type { Plan, Progress, Workflow } from "./types";
import { Checkbox, NativeSelect, Popover, TextInput } from "@mantine/core";
import { IconChevronDown } from "@tabler/icons-react";
import { ProgressBar } from "./Controls";
import { TaskButton } from "./Controls";

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
        <TextInput
          classNames={{ input: "search-filter" }}
          type="search"
          placeholder="Search work"
          aria-label="Search work"
          value={values.search}
          onChange={(event) =>
            onChange({ ...values, search: event.target.value })
          }
        />
        {!projectOnly && (
          <NativeSelect
            classNames={{ input: "select-arrow plan-filter" }}
            data={[
              { value: "", label: "All plans" },
              ...plans.map((item) => ({ value: item.id, label: item.title })),
            ]}
            value={planId}
            onChange={(event) => onPlanChange(event.target.value)}
            aria-label="Plan filter"
          />
        )}
        <StatusFilter
          workflow={workflow}
          values={values}
          onChange={onChange}
          projectOnly={projectOnly}
        />
        <TaskButton type="button" className="clear-filters" onClick={onClear}>
          Clear filters
        </TaskButton>
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
    <div className="status-filter">
    <Popover width={220} position="bottom-end" shadow="md">
      <Popover.Target>
        <TaskButton type="button" className="status-filter-trigger" aria-label="Status filter">
          <span>Status: {activeCount === allCount ? "All" : `${activeCount}/${allCount}`}</span>
          <IconChevronDown aria-hidden="true" size={15} />
        </TaskButton>
      </Popover.Target>
      <Popover.Dropdown className="status-filter-menu" aria-label="Status filter options">
        {levels.map(({ label, key }) => (
          <fieldset className="status-filter-group" key={key}>
            <legend>
              {label}
              <TaskButton type="button" className="status-filter-select-all" onClick={() => selectAll(key)}>
                All
              </TaskButton>
            </legend>
            {workflow.statuses.map((status) => (
              <Checkbox
                key={status.id}
                label={status.name}
                checked={values[key] === null || values[key].includes(status.id)}
                onChange={() => update(key, status.id)}
                size="xs"
              />
            ))}
          </fieldset>
        ))}
      </Popover.Dropdown>
    </Popover>
    </div>
  );
}
