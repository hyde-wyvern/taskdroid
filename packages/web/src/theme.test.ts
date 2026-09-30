import { describe, expect, it } from 'vitest';
import { taskdroidCssVariablesResolver, taskdroidTheme } from './theme';

describe('Taskdroid theme', () => {
  it('defines semantic light and dark tokens', () => {
    const variables = taskdroidCssVariablesResolver(undefined as never);
    expect(taskdroidTheme.primaryColor).toBe('taskdroid');
    expect(variables.light['--taskdroid-text']).toBe('#172033');
    expect(variables.dark['--taskdroid-text']).toBe('#f3f6fb');
    expect(variables.variables['--taskdroid-focus-ring']).toBe('var(--mantine-color-taskdroid-6)');
  });
});
