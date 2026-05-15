import type { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { AuthProvider } from '../features/auth';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <MantineProvider>
      <AuthProvider>{children}</AuthProvider>
    </MantineProvider>
  );
}
