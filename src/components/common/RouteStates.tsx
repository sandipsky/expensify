import { Button, Center, Loader, Stack, Text, Title } from '@mantine/core';
import { IconAlertTriangle, IconError404 } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

export function NotFound() {
  return (
    <Center mih={360} p="lg">
      <Stack align="center" gap="sm" maw={420}>
        <IconError404 size={40} />
        <Title order={3}>Page not found</Title>
        <Text c="dimmed" ta="center" size="sm">
          The page you’re looking for doesn’t exist or has moved.
        </Text>
        <Button component={Link} to="/">
          Back to dashboard
        </Button>
      </Stack>
    </Center>
  );
}

interface RouteErrorProps {
  error: Error;
  reset?: () => void;
}

export function RouteError({ error, reset }: RouteErrorProps) {
  return (
    <Center mih={360} p="lg">
      <Stack align="center" gap="sm" maw={460}>
        <IconAlertTriangle size={40} color="var(--mantine-color-red-6)" />
        <Title order={3}>Couldn’t load this page</Title>
        <Text c="dimmed" ta="center" size="sm">
          {error.message || 'An unexpected error occurred.'}
        </Text>
        {reset && (
          <Button variant="default" onClick={reset}>
            Try again
          </Button>
        )}
      </Stack>
    </Center>
  );
}

export function RoutePending() {
  return (
    <Center mih={360} p="lg">
      <Loader />
    </Center>
  );
}
