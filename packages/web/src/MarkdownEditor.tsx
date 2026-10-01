import { useComputedColorScheme } from "@mantine/core";
import { lazy, Suspense } from "react";

const MarkdownEditorSurface = lazy(() => import("./MarkdownEditorSurface"));

export function MarkdownEditor({
  label,
  value,
  onChange,
  height = 260,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  height?: number;
  disabled?: boolean;
}) {
  const colorScheme = useComputedColorScheme("light");

  return (
    <div className="markdown-editor-field">
      <div className="markdown-editor-label">{label}</div>
      <div className="markdown-editor" data-color-mode={colorScheme}>
        <Suspense
          fallback={
            <textarea
              aria-label={label}
              value={value}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              rows={8}
            />
          }
        >
          <MarkdownEditorSurface
            label={label}
            value={value}
            onChange={onChange}
            height={height}
            disabled={disabled}
          />
        </Suspense>
      </div>
    </div>
  );
}