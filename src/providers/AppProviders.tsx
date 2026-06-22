import {
  MantineProvider,
  createTheme,
  localStorageColorSchemeManager,
} from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { queryClient } from '../lib/queryClient';
import { router } from '../router';
import { ErrorBoundary } from '../components/common';

const theme = createTheme({
  primaryColor: 'indigo',
  defaultRadius: 'md',
  fontFamily:
    "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  // Compact, consistent type scale (rem against a 16px root) so Mantine
  // components match the 14px body base instead of their default 16px scale.
  fontSizes: {
    xs: '0.75rem', // 12px
    sm: '0.8125rem', // 13px — default size for inputs, buttons, tables
    md: '0.875rem', // 14px — base body text
    lg: '1rem', // 16px
    xl: '1.125rem', // 18px
  },
  lineHeights: {
    xs: '1.4',
    sm: '1.45',
    md: '1.5',
    lg: '1.55',
    xl: '1.6',
  },
  headings: {
    fontFamily:
      "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '1.5rem', lineHeight: '1.3', fontWeight: '600' }, // 24px
      h2: { fontSize: '1.25rem', lineHeight: '1.35', fontWeight: '600' }, // 20px
      h3: { fontSize: '1.125rem', lineHeight: '1.4', fontWeight: '600' }, // 18px
      h4: { fontSize: '1rem', lineHeight: '1.45', fontWeight: '600' }, // 16px
      h5: { fontSize: '0.875rem', lineHeight: '1.5', fontWeight: '600' }, // 14px
      h6: { fontSize: '0.8125rem', lineHeight: '1.5', fontWeight: '600' }, // 13px
    },
  },
  components: {
    Button: { defaultProps: { radius: 'md' } },
    Card: { defaultProps: { radius: 'lg', withBorder: true } },
    Paper: { defaultProps: { radius: 'lg' } },
    Modal: {
      defaultProps: { radius: 'lg', centered: true },
      styles: { title: { fontSize: '1.25rem', fontWeight: 700 } },
    },
    TextInput: { defaultProps: { radius: 'md' } },
    NumberInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
    Textarea: { defaultProps: { radius: 'md' } },
  },
});

const colorSchemeManager = localStorageColorSchemeManager({
  key: 'expensify-color-scheme',
});

export function AppProviders() {
  return (
    <MantineProvider
      theme={theme}
      defaultColorScheme="light"
      colorSchemeManager={colorSchemeManager}
    >
      <DatesProvider settings={{ firstDayOfWeek: 1 }}>
        <Notifications position="top-right" />
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </QueryClientProvider>
      </DatesProvider>
    </MantineProvider>
  );
}
