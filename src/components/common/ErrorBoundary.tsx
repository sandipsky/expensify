import { Component, type ReactNode } from 'react';
import { Button, Center, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    // A real backend integration would forward this to an error-tracking service.
    console.error('Unhandled UI error:', error);
  }

  handleReload = (): void => {
    window.location.assign('/');
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <Center mih="100vh" p="lg">
          <Stack align="center" gap="sm" maw={420}>
            <IconAlertTriangle size={40} color="var(--mantine-color-red-6)" />
            <Title order={3}>Something went wrong</Title>
            <Text c="dimmed" ta="center" size="sm">
              {this.state.error.message || 'An unexpected error occurred.'}
            </Text>
            <Button onClick={this.handleReload}>Back to dashboard</Button>
          </Stack>
        </Center>
      );
    }
    return this.props.children;
  }
}
