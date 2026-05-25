import { z } from 'zod';

export const accountFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(60, 'Name must be 60 characters or fewer'),
  initialAmount: z
    .number({ message: 'Initial amount is required' })
    .finite('Initial amount must be a number'),
  notes: z.string().max(280, 'Notes must be 280 characters or fewer').optional(),
});

export type IAccountFormValues = z.infer<typeof accountFormSchema>;
