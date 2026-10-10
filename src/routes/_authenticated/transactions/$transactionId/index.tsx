import { createFileRoute } from '@tanstack/react-router'
import { TransactionDetail } from '@/features/transactions'

export const Route = createFileRoute('/_authenticated/transactions/$transactionId/')({
  component: TransactionDetailPage,
})

function TransactionDetailPage() {
  const { transactionId } = Route.useParams()
  return <TransactionDetail transactionId={transactionId} />
}
