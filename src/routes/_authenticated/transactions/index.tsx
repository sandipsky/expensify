import { createFileRoute } from '@tanstack/react-router'
import { TransactionList } from '@/features/transactions'

export const Route = createFileRoute('/_authenticated/transactions/')({
  component: TransactionList,
})
