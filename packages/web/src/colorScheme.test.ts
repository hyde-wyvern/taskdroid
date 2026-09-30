// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { colorSchemeManager, colorSchemeStorageKey } from './colorScheme';

afterEach(() => localStorage.clear());

describe('color scheme storage', () => {
  it('uses system mode by default and persists an explicit selection', () => {
    expect(colorSchemeManager.get('auto')).toBe('auto');
    colorSchemeManager.set('dark');
    expect(localStorage.getItem(colorSchemeStorageKey)).toBe('dark');
    expect(colorSchemeManager.get('auto')).toBe('dark');
  });
});
