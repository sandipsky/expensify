import dayjs from 'dayjs';
import { z } from 'zod';

export const transactionKindSchema = z.enum(['expense', 'income', 'transfer']);

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024; // 5 MB

// How far into the future a transaction date may be (PROJECT.md section 7).
export const MAX_FUTURE_DAYS = 365;

export const transactionAttachmentSchema = z.object({
  name: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  dataUrl: z.string().min(1),
});

export const transactionFormSchema = z
  .object({
    kind: transactionKindSchema,
    amount: z
      .number({ message: 'Amount is required' })
      .positive('Amount must be greater than zero')
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-9,
        'Amount can have at most 2 decimal places',
      ),
    accountId: z.string().min(1, 'Account is required'),
    toAccountId: z.string().nullable().optional(),
    categoryId: z.string().nullable().optional(),
    date: z.string().min(1, 'Date is required'),
    notes: z.string().max(280, 'Notes must be 280 characters or fewer').optional(),
    attachment: transactionAttachmentSchema.nullable().optional(),
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

    if (data.date) {
      const parsed = dayjs(data.date);
      if (!parsed.isValid()) {
        ctx.addIssue({ code: 'custom', path: ['date'], message: 'Invalid date' });
      } else if (parsed.isAfter(dayjs().add(MAX_FUTURE_DAYS, 'day'), 'day')) {
        ctx.addIssue({
          code: 'custom',
          path: ['date'],
          message: 'Date is too far in the future',
        });
      }
    }

    if (data.attachment) {
      if (
        !ALLOWED_ATTACHMENT_MIME_TYPES.includes(
          data.attachment.mimeType as (typeof ALLOWED_ATTACHMENT_MIME_TYPES)[number],
        )
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['attachment'],
          message: 'Attachment must be an image (PNG, JPG, WEBP) or a PDF',
        });
      }
      if (data.attachment.size > MAX_ATTACHMENT_SIZE) {
        ctx.addIssue({
          code: 'custom',
          path: ['attachment'],
          message: 'Attachment must be 5 MB or smaller',
        });
      }
    }
  });

export type ITransactionFormValues = z.infer<typeof transactionFormSchema>;
