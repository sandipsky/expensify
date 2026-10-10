import { createFileRoute } from '@tanstack/react-router'
import { TransactionList, listStartOf, parseTransactionSearch } from '@/features/transactions'

// A link can open the list on a period, a type and categories, as the
// dashboard's drill-downs do.
export const Route = createFileRoute('/_authenticated/transactions/')({
  validateSearch: parseTransactionSearch,
  component: Transactions,
})

function Transactions() {
  const search = Route.useSearch()
  // A new link into the list starts it over, so the sidebar's plain link clears a drill-down.
  return <TransactionList key={JSON.stringify(search)} start={listStartOf(search)} />
}
