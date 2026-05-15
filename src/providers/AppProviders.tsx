import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { RouterProvider } from '@tanstack/react-router';
import { AuthProvider } from '../features/auth';
import { router } from '../router';

export function AppProviders() {
  return (
    <MantineProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </MantineProvider>
  );
}
