import { createFileRoute } from '@tanstack/react-router'
import { CashFlowReport, parseCashFlowSearch } from '@/features/reports'

// The filters live in the search params, so Back from a drill-down returns to them.
export const Route = createFileRoute('/_authenticated/reports/cash-flow/')({
  validateSearch: parseCashFlowSearch,
  component: CashFlowReportPage,
})

function CashFlowReportPage() {
  const search = Route.useSearch()
  return <CashFlowReport search={search} />
}
