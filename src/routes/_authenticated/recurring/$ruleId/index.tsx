import { createFileRoute } from '@tanstack/react-router'
import { RuleDetail } from '@/features/recurring'

export const Route = createFileRoute('/_authenticated/recurring/$ruleId/')({
  component: RuleDetailPage,
})

function RuleDetailPage() {
  const { ruleId } = Route.useParams()
  return <RuleDetail ruleId={ruleId} />
}
