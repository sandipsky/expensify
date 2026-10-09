import { createFileRoute } from '@tanstack/react-router'
import { AccountList } from '@/features/accounts'

export const Route = createFileRoute('/_authenticated/accounts/')({
  component: AccountList,
})
