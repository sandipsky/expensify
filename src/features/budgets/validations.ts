import { z } from 'zod';

export const budgetDurationSchema = z.enum([
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
]);

export const budgetFormSchema = z
  .object({
    amount: z
      .number({ message: 'Amount is required' })
      .positive('Amount must be greater than zero'),
    categoryId: z.string().min(1, 'Category is required'),
    accountId: z.string().min(1, 'Account is required'),
    duration: budgetDurationSchema,
    startAt: z.string().min(1, 'Start date is required'),
    endAt: z.string().min(1, 'End date is required'),
  })
  .superRefine((data, ctx) => {
    if (data.endAt < data.startAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endAt'],
        message: 'End must be on or after start',
      });
    }
  });

export type IBudgetFormValues = z.infer<typeof budgetFormSchema>;
