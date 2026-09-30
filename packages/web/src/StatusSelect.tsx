import type { Status } from "./types";
import { NativeSelect } from "@mantine/core";

export function StatusSelect({
  statuses,
  value,
  onChange,
  disabled = false,
  compact = false,
  id,
  label = "Status",
}: {
  statuses: Status[];
  value: string;
  onChange: (statusId: string) => void;
  disabled?: boolean;
  compact?: boolean;
  id?: string;
  label?: string;
}) {
  const color = statuses.find((status) => status.id === value)?.color;
  return (
    <NativeSelect
      id={id}
      classNames={{
        input: `select-arrow status-select${compact ? " compact" : ""}`,
      }}
      styles={{ input: { borderColor: color } }}
      aria-label={label}
      data={statuses.map((status) => ({
        value: status.id,
        label: status.name,
      }))}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
