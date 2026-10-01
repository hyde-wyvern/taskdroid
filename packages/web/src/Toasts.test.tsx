// @vitest-environment jsdom
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./Toasts";
import { renderWithMantine } from "./testUtils";

function Trigger() {
  const toast = useToast();
  return <button onClick={() => toast("Task saved")}>Save</button>;
}

describe("ToastProvider", () => {
  it("shows and dismisses successful action feedback", () => {
    renderWithMantine(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status").textContent).toContain("Task saved");
    expect(document.querySelector(".toast-stack")?.parentElement).toBe(
      document.body,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss notification" }),
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});
