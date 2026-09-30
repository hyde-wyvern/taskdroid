import { describe, expect, it } from 'vitest';
import { shouldLoadTasks } from './App';

describe('shouldLoadTasks', () => {
  it('loads selected plan tasks from Project view', () => {
    expect(shouldLoadTasks('plans', 'plan-1')).toBe(true);
    expect(shouldLoadTasks('plans', '')).toBe(false);
  });
});
