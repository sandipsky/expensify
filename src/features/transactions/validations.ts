import { z } from 'zod';

export const transactionKindSchema = z.enum(['expense', 'income', 'transfer']);

export const transactionFormSchema = z
  .object({
    kind: transactionKindSchema,
    amount: z
      .number({ message: 'Amount is required' })
      .positive('Amount must be greater than zero'),
    accountId: z.string().min(1, 'Account is required'),
    toAccountId: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    date: z.string().min(1, 'Date is required'),
    notes: z.string().max(280, 'Notes must be 280 characters or fewer').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === 'transfer') {
      if (!data.toAccountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Destination account is required',
        });
      } else if (data.toAccountId === data.accountId) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAccountId'],
          message: 'Destination must differ from source',
        });
      }
    } else if (!data.categoryId) {
      ctx.addIssue({
        code: 'custom',
        path: ['categoryId'],
        message: 'Category is required',
      });
    }
  });

export type ITransactionFormValues = z.infer<typeof transactionFormSchema>;
