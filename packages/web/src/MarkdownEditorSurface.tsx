import MDEditor from "@uiw/react-md-editor/nohighlight";
import "@uiw/react-md-editor/markdown-editor.css";
import "@uiw/react-markdown-preview/markdown.css";
import { MarkdownContent } from "./MarkdownContent";

export default function MarkdownEditorSurface({
  label,
  value,
  onChange,
  height,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  height: number;
  disabled: boolean;
}) {
  return (
    <MDEditor
      value={value}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      height={height}
      preview="edit"
      visibleDragbar={false}
      textareaProps={{ "aria-label": label, disabled }}
      components={{
        preview: (source) => <MarkdownContent content={source} />,
      }}
    />
  );
}
