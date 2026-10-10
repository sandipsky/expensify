import { createFileRoute } from '@tanstack/react-router'
import { DashboardPage, parseDashboardSearch } from '@/features/dashboard'

// The period lives in the search params, so Back from a drill-down returns to it.
export const Route = createFileRoute('/_authenticated/')({
  validateSearch: parseDashboardSearch,
  component: Dashboard,
})

function Dashboard() {
  const search = Route.useSearch()
  return <DashboardPage search={search} />
}
