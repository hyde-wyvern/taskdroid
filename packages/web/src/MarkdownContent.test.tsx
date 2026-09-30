// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownContent } from "./MarkdownContent";

describe("MarkdownContent", () => {
  it("renders common Markdown syntax", () => {
    render(
      <MarkdownContent
        content={[
          "# Release notes",
          "",
          "A **safe** preview with [a link](https://example.com).",
          "",
          "- First item",
          "- Second item",
          "",
          "```ts",
          "const answer = 42;",
          "```",
        ].join("\n")}
      />,
    );

    expect(screen.getByRole("heading", { name: "Release notes" })).toBeTruthy();
    expect(screen.getByText("safe").tagName).toBe("STRONG");
    expect(
      screen.getByRole("link", { name: "a link" }).getAttribute("href"),
    ).toBe("https://example.com");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("const answer = 42;")).toBeTruthy();
  });

  it("does not render raw HTML or unsafe link protocols", () => {
    const { container } = render(
      <MarkdownContent
        content={
          '<img src="x" onerror="alert(1)" />\n\n[unsafe](javascript:alert(1))'
        }
      />,
    );

    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("link", { name: "unsafe" })).toBeNull();
    expect(screen.getByText("unsafe").tagName).toBe("SPAN");
  });
});
