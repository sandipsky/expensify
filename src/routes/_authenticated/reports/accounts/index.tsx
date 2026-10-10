import { createFileRoute } from '@tanstack/react-router'
import { AccountsReport, parseAccountsSearch } from '@/features/reports'

// The filters live in the search params, so Back from a drill-down returns to them.
export const Route = createFileRoute('/_authenticated/reports/accounts/')({
  validateSearch: parseAccountsSearch,
  component: AccountsReportPage,
})

function AccountsReportPage() {
  const search = Route.useSearch()
  return <AccountsReport search={search} />
}
