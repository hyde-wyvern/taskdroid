import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { colorSchemeManager } from './colorScheme';
import { taskdroidCssVariablesResolver, taskdroidTheme } from './theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <MantineProvider
    theme={taskdroidTheme}
    cssVariablesResolver={taskdroidCssVariablesResolver}
    colorSchemeManager={colorSchemeManager}
    defaultColorScheme="auto"
  >
    {children}
  </MantineProvider>;
}
