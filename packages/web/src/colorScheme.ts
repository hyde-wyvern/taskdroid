import { localStorageColorSchemeManager } from '@mantine/core';

export const colorSchemeStorageKey = 'taskdroid-color-scheme';
export const colorSchemeManager = localStorageColorSchemeManager({ key: colorSchemeStorageKey });
