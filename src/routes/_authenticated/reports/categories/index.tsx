import { createFileRoute } from '@tanstack/react-router'
import { CategoryReport, parseCategorySearch } from '@/features/reports'

// The filters live in the search params, so Back from a drill-down returns to them.
export const Route = createFileRoute('/_authenticated/reports/categories/')({
  validateSearch: parseCategorySearch,
  component: CategoryReportPage,
})

function CategoryReportPage() {
  const search = Route.useSearch()
  return <CategoryReport search={search} />
}
