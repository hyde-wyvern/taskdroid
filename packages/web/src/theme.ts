import { createTheme, type CSSVariablesResolver } from '@mantine/core';

export const taskdroidTheme = createTheme({
  primaryColor: 'taskdroid',
  primaryShade: { light: 6, dark: 7 },
  colors: {
    taskdroid: ['#edf3ff', '#dce8ff', '#bed3ff', '#92b4fb', '#6491ec', '#4777df', '#2f64d6', '#2452bb', '#1c4398', '#173978'],
  },
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: '700' },
  defaultRadius: 'md',
  radius: { xs: '4px', sm: '6px', md: '8px', lg: '10px', xl: '12px' },
  spacing: { xs: '6px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
  shadows: { xs: '0 1px 2px rgb(27 41 69 / 10%)', sm: '0 4px 16px rgb(23 32 51 / 16%)' },
  other: {
    colors: {
      success: '#31a66a',
      warning: '#ca8a04',
      danger: '#c5393e',
    },
  },
});

export const taskdroidCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {
    '--taskdroid-radius-card': 'var(--mantine-radius-lg)',
    '--taskdroid-shadow-card': 'var(--mantine-shadow-xs)',
    '--taskdroid-focus-ring': 'var(--mantine-color-taskdroid-6)',
  },
  light: {
    '--taskdroid-app-background': '#f4f6f9',
    '--taskdroid-surface': '#ffffff',
    '--taskdroid-surface-muted': '#e9edf3',
    '--taskdroid-text': '#172033',
    '--taskdroid-text-muted': '#687287',
    '--taskdroid-border': '#dfe3ea',
  },
  dark: {
    '--taskdroid-app-background': '#111827',
    '--taskdroid-surface': '#172033',
    '--taskdroid-surface-muted': '#253247',
    '--taskdroid-text': '#f3f6fb',
    '--taskdroid-text-muted': '#b3bfce',
    '--taskdroid-border': '#334155',
  },
});
