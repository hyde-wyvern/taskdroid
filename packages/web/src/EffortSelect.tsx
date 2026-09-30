import { NativeSelect } from "@mantine/core";

export const EFFORT_OPTIONS = [
  0, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 100,
] as const;

export function EffortSelect({
  value,
  onChange,
  label = "Effort points",
}: {
  value: number;
  onChange: (effort: number) => void;
  label?: string;
}) {
  return (
    <NativeSelect
      classNames={{ input: "effort-select" }}
      aria-label={label}
      data={EFFORT_OPTIONS.map((effort) => ({
        value: String(effort),
        label: `${effort} points`,
      }))}
      value={String(value)}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
