import { createFileRoute } from '@tanstack/react-router'
import { BudgetReport, parseBudgetReportSearch } from '@/features/reports'

// The filters live in the search params, so Back from a drill-down returns to them.
export const Route = createFileRoute('/_authenticated/reports/budgets/')({
  validateSearch: parseBudgetReportSearch,
  component: BudgetReportPage,
})

function BudgetReportPage() {
  const search = Route.useSearch()
  return <BudgetReport search={search} />
}
