import { createFileRoute } from '@tanstack/react-router'
import { AccountDetail } from '@/features/accounts'

export const Route = createFileRoute('/_authenticated/accounts/$accountId/')({
  component: AccountDetailPage,
})

function AccountDetailPage() {
  const { accountId } = Route.useParams()
  return <AccountDetail accountId={accountId} />
}
