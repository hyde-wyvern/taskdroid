// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { IconX } from "@tabler/icons-react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DialogShell, IconAction, ProgressBar, TaskButton } from "./Controls";
import { StatusSelect } from "./StatusSelect";
import { renderWithMantine } from "./testUtils";

afterEach(cleanup);

describe("shared Mantine controls", () => {
  it("provides a named icon action, tooltip, and click handler", async () => {
    const onClick = vi.fn();
    renderWithMantine(
      <IconAction
        label="Close panel"
        icon={<IconX size={18} />}
        onClick={onClick}
      />,
    );
    const action = screen.getByRole("button", { name: "Close panel" });
    fireEvent.mouseEnter(action);
    await waitFor(() =>
      expect(screen.getByRole("tooltip", { name: "Close panel" })).toBeTruthy(),
    );
    fireEvent.click(action);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("provides modal semantics and closes on Escape", async () => {
    const onClose = vi.fn();
    renderWithMantine(
      <DialogShell title="Edit task" onClose={onClose}>
        <h2>Edit task</h2>
        <TaskButton variant="primary">Save</TaskButton>
      </DialogShell>,
    );
    expect(screen.getByRole("dialog", { name: "Edit task" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Edit task" }), {
      key: "Escape",
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it("uses a native named status select and reports keyboard selection changes", () => {
    const onChange = vi.fn();
    const statuses = [
      { id: "todo", name: "Todo", color: "#3b82f6", completed: false },
      { id: "closed", name: "Closed", color: "#334155", completed: true },
    ];
    renderWithMantine(
      <StatusSelect
        statuses={statuses}
        value="todo"
        onChange={onChange}
        label="Task status"
      />,
    );

    const select = screen.getByRole("combobox", { name: "Task status" });
    expect(select.tagName).toBe("SELECT");
    expect(select).toHaveProperty("value", "todo");
    fireEvent.change(select, { target: { value: "closed" } });
    expect(onChange).toHaveBeenCalledWith("closed");
  });

  it("exposes one named progressbar with a bounded value", () => {
    renderWithMantine(<ProgressBar value={120} label="Task progress" />);
    const progress = screen.getByRole("progressbar", { name: "Task progress" });
    expect(progress.getAttribute("aria-valuenow")).toBe("100");
    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
  });
});
