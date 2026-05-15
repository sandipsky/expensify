import { type FormEvent, useState } from 'react';
import {
  Button,
  Paper,
  PasswordInput,
  Stack,
  TextInput,
  Title,
} from '@mantine/core';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('demo@expensify.app');
  const [password, setPassword] = useState('demo');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login({ email, password });
  };

  return (
    <div className="login-page">
      <Paper className="login-page-card" shadow="md" radius="md" p="xl" withBorder>
        <Title order={2} ta="center" mb="lg">
          Welcome to Expensify
        </Title>

        <form onSubmit={handleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Email"
              placeholder="you@example.com"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
            <PasswordInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />
            <Button type="submit" fullWidth mt="sm">
              Login
            </Button>
            <p className="login-page-hint">
              Any email/password is accepted — a dummy token is stored.
            </p>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
