// @vitest-environment jsdom
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MarkdownEditor } from "./MarkdownEditor";
import { renderWithMantine } from "./testUtils";

describe("MarkdownEditor", () => {
  it("starts in source mode and lets the user open the Markdown preview", async () => {
    const onChange = vi.fn();
    renderWithMantine(
      <MarkdownEditor
        label="Detailed plan (Markdown)"
        value="# Draft plan"
        onChange={onChange}
      />,
    );

    expect(
      screen.getByRole("textbox", { name: "Detailed plan (Markdown)" }),
    ).toHaveProperty("value", "# Draft plan");
    expect(screen.queryByRole("heading", { name: "Draft plan" })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: /Preview code/ }));
    expect(
      await screen.findByRole("heading", { name: "Draft plan" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Edit code/ }));
    fireEvent.change(
      screen.getByRole("textbox", { name: "Detailed plan (Markdown)" }),
      { target: { value: "## Updated draft" } },
    );
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("## Updated draft"));
  });

  it("sanitizes raw HTML in its preview", async () => {
    const { container } = renderWithMantine(
      <MarkdownEditor
        label="Source plan (Markdown)"
        value={'<img src="x" onerror="alert(1)" />'}
        onChange={vi.fn()}
      />,
    );

    await waitFor(() => expect(container.querySelector("img")).toBeNull());
    expect(screen.getByRole("textbox", { name: "Source plan (Markdown)" })).toBeTruthy();
  });
});