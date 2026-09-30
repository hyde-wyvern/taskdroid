import { describe, expect, it } from "vitest";
import { taskdroidCssVariablesResolver, taskdroidTheme } from "./theme";

describe("Taskdroid theme", () => {
  it("defines semantic light and dark tokens", () => {
    const variables = taskdroidCssVariablesResolver(undefined as never);
    expect(taskdroidTheme.primaryColor).toBe("taskdroid");
    expect(variables.light["--taskdroid-app-background"]).toBe("#f4f6f9");
    expect(variables.light["--taskdroid-text"]).toBe("#172033");
    expect(variables.dark["--taskdroid-app-background"]).toBe("#18122b");
    expect(variables.dark["--taskdroid-surface-raised"]).toBe("#393053");
    expect(variables.dark["--taskdroid-surface-muted"]).toBe("#443c68");
    expect(variables.dark["--taskdroid-surface-hover"]).toBe("#635985");
    expect(variables.dark["--taskdroid-text"]).toBe("#f6f4fb");
    expect(variables.dark["--taskdroid-text-muted"]).toBe("#d8d2e8");
    expect(variables.dark["--taskdroid-link"]).toBe("#92b4fb");
    expect(variables.dark["--taskdroid-selected-surface"]).toBe("#393053");
    expect(variables.dark["--taskdroid-border"]).toBe("#8b80ad");
    expect(
      contrastRatio(
        variables.dark["--taskdroid-text"],
        variables.dark["--taskdroid-app-background"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        variables.dark["--taskdroid-text"],
        variables.dark["--taskdroid-surface"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        variables.dark["--taskdroid-text-muted"],
        variables.dark["--taskdroid-surface-muted"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        variables.dark["--taskdroid-link"],
        variables.dark["--taskdroid-surface-raised"],
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(
        variables.dark["--taskdroid-border"],
        variables.dark["--taskdroid-surface-raised"],
      ),
    ).toBeGreaterThanOrEqual(3);
    expect(taskdroidTheme.colors?.dark?.[8]).toBe("#443c68");
    expect(taskdroidTheme.colors?.taskdroid?.[6]).toBe("#2f64d6");
    expect(taskdroidTheme.other?.colors.danger).toBe("#c5393e");
    expect(variables.variables["--taskdroid-focus-ring"]).toBe(
      "var(--mantine-color-taskdroid-6)",
    );
  });
});

function contrastRatio(foreground: string, background: string) {
  const lighter = luminance(foreground);
  const darker = luminance(background);
  return (
    (Math.max(lighter, darker) + 0.05) / (Math.min(lighter, darker) + 0.05)
  );
}

function luminance(color: string) {
  const [red, green, blue] = color.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
