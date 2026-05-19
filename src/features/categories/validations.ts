import { z } from 'zod';

export const categoryTypeSchema = z.enum(['income', 'expense']);

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(50, 'Name must be 50 characters or fewer'),
  type: categoryTypeSchema,
  icon: z.string().min(1, 'Pick an icon'),
});

export type ICategoryFormValues = z.infer<typeof categoryFormSchema>;
