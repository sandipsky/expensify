import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { config } from '../config/env';
import { AuthProvider } from '../features/auth';
import { queryClient } from '../lib/queryClient';
import { router } from '../router';

export function AppProviders() {
  return (
    <MantineProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
        {config.app.isDev && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </MantineProvider>
  );
}
