import { createFileRoute } from '@tanstack/react-router'
import { BudgetDetail } from '@/features/budgets'

export const Route = createFileRoute('/_authenticated/budgets/$budgetId/')({
  component: BudgetDetailPage,
})

function BudgetDetailPage() {
  const { budgetId } = Route.useParams()
  return <BudgetDetail budgetId={budgetId} />
}
