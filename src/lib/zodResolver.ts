import type { z } from 'zod';

export function zodResolver<T extends z.ZodTypeAny>(schema: T) {
  return (values: z.input<T>): Record<string, string> => {
    const result = schema.safeParse(values);
    if (result.success) return {};
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (path && !(path in errors)) {
        errors[path] = issue.message;
      }
    }
    return errors;
  };
}
