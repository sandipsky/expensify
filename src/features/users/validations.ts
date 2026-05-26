import { z } from 'zod';

export const userRoleSchema = z.enum(['admin', 'user']);

const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be 32 characters or fewer')
  .regex(/^[a-z0-9_.-]+$/, 'Use letters, numbers, dots, underscores or dashes');

const passwordField = z
  .string()
  .min(3, 'Password must be at least 3 characters')
  .max(64, 'Password must be 64 characters or fewer');

const nameField = z
  .string()
  .trim()
  .min(1, 'Display name is required')
  .max(60, 'Display name must be 60 characters or fewer');

export const userCreateFormSchema = z.object({
  username: usernameField,
  password: passwordField,
  name: nameField,
  role: userRoleSchema,
});

export const userUpdateFormSchema = z.object({
  username: usernameField,
  password: z.union([passwordField, z.literal('')]),
  name: nameField,
  role: userRoleSchema,
});

export type IUserCreateFormValues = z.infer<typeof userCreateFormSchema>;
export type IUserUpdateFormValues = z.infer<typeof userUpdateFormSchema>;
