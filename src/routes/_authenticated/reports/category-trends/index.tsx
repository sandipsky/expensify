import { createFileRoute } from '@tanstack/react-router'
import { CategoryTrendReport, parseCategoryTrendSearch } from '@/features/reports'

// The filters live in the search params, so Back from a drill-down returns to them.
export const Route = createFileRoute('/_authenticated/reports/category-trends/')({
  validateSearch: parseCategoryTrendSearch,
  component: CategoryTrendReportPage,
})

function CategoryTrendReportPage() {
  const search = Route.useSearch()
  return <CategoryTrendReport search={search} />
}
