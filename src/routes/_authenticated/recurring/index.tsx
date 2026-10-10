import { createFileRoute } from '@tanstack/react-router'
import { RecurringList } from '@/features/recurring'

export const Route = createFileRoute('/_authenticated/recurring/')({
  component: RecurringList,
})
