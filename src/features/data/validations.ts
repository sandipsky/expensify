import { z } from 'zod';

// Schemas for validating an imported backup file (PROJECT.md 3.7 — "Validates
// with Zod on the client"). These describe stored entity shapes, not form input.

const isoLikeString = z.string().min(1);

export const accountImportSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'name is required'),
  initialAmount: z.number().finite('initialAmount must be a number'),
  notes: z.string().optional().default(''),
  createdAt: z.string().optional(),
});

export const categoryImportSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'name is required'),
  type: z.enum(['income', 'expense']),
  icon: z.string().min(1, 'icon is required'),
  createdAt: z.string().optional(),
});

export const budgetImportSchema = z.object({
  id: z.string().optional(),
  amount: z.number().positive('amount must be greater than zero'),
  categoryId: z.string().min(1, 'categoryId is required'),
  accountId: z.string().min(1, 'accountId is required'),
  duration: z.enum(['weekly', 'monthly', 'quarterly', 'yearly', 'custom']),
  startAt: isoLikeString,
  endAt: isoLikeString,
  createdAt: z.string().optional(),
});

const attachmentImportSchema = z
  .object({
    name: z.string(),
    mimeType: z.string(),
    size: z.number(),
    dataUrl: z.string(),
  })
  .nullable();

export const transactionImportSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(['expense', 'income', 'transfer']),
  amount: z.number().positive('amount must be greater than zero'),
  accountId: z.string().min(1, 'accountId is required'),
  toAccountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  date: isoLikeString,
  notes: z.string().optional().default(''),
  attachment: attachmentImportSchema.optional(),
  createdAt: z.string().optional(),
});

export const backupSchema = z.object({
  version: z.number().optional(),
  exportedAt: z.string().optional(),
  accounts: z.array(z.unknown()),
  categories: z.array(z.unknown()),
  budgets: z.array(z.unknown()),
  transactions: z.array(z.unknown()),
});

export type IImportAccount = z.infer<typeof accountImportSchema> & { id: string };
export type IImportCategory = z.infer<typeof categoryImportSchema> & { id: string };
export type IImportBudget = z.infer<typeof budgetImportSchema> & { id: string };
export type IImportTransaction = z.infer<typeof transactionImportSchema> & {
  id: string;
};

export type EntityName = 'accounts' | 'categories' | 'budgets' | 'transactions';
export type ConflictPolicy = 'skip' | 'overwrite' | 'rename';

export interface IRowError {
  entity: EntityName;
  row: number;
  message: string;
}
