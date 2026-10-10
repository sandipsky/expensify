import {
  LUIBreadcrumb,
  LUIButton,
  LUICard,
  LUIDateInput,
  LUIIcon,
  LUISegmentedControl,
  LUISkeleton,
  LUITooltip,
} from '@lumen-ui/react'
import { EmptyState } from '@/components/empty-state'
import { useMediaQuery } from '@/components/sheet'
import { useTransactionActions } from '@/features/transactions/transaction.actions'
import { getApiErrorMessage } from '@/lib'
import { parseYmd, toYmd } from '@/utils'
import { DASHBOARD_PRESET_OPTIONS, type DashboardCard } from '../dashboard.labels'
import { DASHBOARD_PRESETS, type DashboardPreset, type DashboardSearch } from '../dashboard.types'
import { useDashboard } from '../useDashboard'
import { BalancesCard } from './BalancesCard'
import { BudgetsCard } from './BudgetsCard'
import { RecentCard } from './RecentCard'
import { SpendingCard } from './SpendingCard'
import { SummaryCards } from './SummaryCards'
import { TrendCard } from './TrendCard'
import { UpcomingCard } from './UpcomingCard'
import './DashboardPage.scss'

/** Phones get a full-width period switcher. */
const PHONE = '(max-width: 599.98px)'

interface DashboardPageProps {
  /** The period from the URL. */
  search: DashboardSearch
}

/**
 * `/`, the default screen: the period switcher pinned to the top, then the
 * cards, one column on phones, two on tablets, and on desktops the four
 * summary cards in one row, balances, spending and budgets in the next, then
 * the trend beside recent transactions. A period with no entries shows one
 * empty state in place of the period cards, while the balances, budgets and
 * upcoming cards stay. Privacy mode masks every amount. Skeletons show while
 * a period loads for the first time.
 */
export const DashboardPage = ({ search }: DashboardPageProps) => {
  const dash = useDashboard(search)
  const phone = useMediaQuery(PHONE)
  const actions = useTransactionActions()

  const selectPreset = (value: unknown) => {
    if (DASHBOARD_PRESETS.includes(value as DashboardPreset)) dash.setPreset(value as DashboardPreset)
  }

  const setCustomDate = (edge: 'start' | 'end', date: Date | null) => {
    if (!date) return
    dash.setCustom({ ...dash.custom, [edge]: toYmd(date) })
  }

  const header = (
    <div className="dash__header">
      <LUIBreadcrumb title="Dashboard" />
      <div className="dash__actions">
        <LUITooltip content={dash.masked ? 'Show amounts' : 'Hide amounts'}>
          <LUIButton
            variant="ghost"
            size="lg"
            rounded
            className="dash__privacy"
            aria-pressed={dash.masked}
            aria-label="Hide amounts"
            onClick={dash.togglePrivacy}
          >
            <LUIIcon name={dash.masked ? 'eye_slash' : 'eye'} color="inherit" />
          </LUIButton>
        </LUITooltip>
      </div>
    </div>
  )

  const period = (
    <section className="dash__period" aria-label="Period">
      <LUISegmentedControl
        options={DASHBOARD_PRESET_OPTIONS}
        size="lg"
        fullWidth={phone}
        value={dash.preset}
        onChange={selectPreset}
      />
      <p className="dash__period-label" aria-live="polite">
        {dash.periodLabel}
      </p>
      {dash.preset === 'custom' && (
        <div className="dash__custom">
          <LUIDateInput
            label="From"
            calendar="ad"
            clearable={false}
            value={parseYmd(dash.custom.start)}
            onChange={(date) => setCustomDate('start', date)}
          />
          <LUIDateInput
            label="To"
            calendar="ad"
            clearable={false}
            value={parseYmd(dash.custom.end)}
            onChange={(date) => setCustomDate('end', date)}
          />
        </div>
      )}
    </section>
  )

  if (dash.loading) {
    return (
      <div className="dash">
        {header}
        {period}
        <div className="dash__grid" aria-busy="true">
          <div className="dash__card dash__card--summary">
            <LUISkeleton height="88px" />
          </div>
          <div className="dash__card dash__card--balances">
            <LUISkeleton height="240px" />
          </div>
          <div className="dash__card dash__card--spending">
            <LUISkeleton height="240px" />
          </div>
          <div className="dash__card dash__card--budgets">
            <LUISkeleton height="240px" />
          </div>
        </div>
      </div>
    )
  }

  if (dash.error) {
    return (
      <div className="dash">
        {header}
        {period}
        <div className="alert error">{getApiErrorMessage(dash.error)}</div>
      </div>
    )
  }

  /** The card for a slot, or null when the slot has nothing to show. */
  const render = (card: DashboardCard) => {
    switch (card) {
      case 'summary':
        return <SummaryCards dash={dash} />
      case 'balances':
        return <BalancesCard dash={dash} />
      case 'spending':
        return <SpendingCard dash={dash} />
      case 'budgets':
        return <BudgetsCard dash={dash} />
      case 'trend':
        return <TrendCard dash={dash} />
      case 'recent':
        return <RecentCard dash={dash} />
      case 'upcoming':
        // Hidden while there's nothing due: no rules, or none in the next week.
        return dash.upcoming.length ? <UpcomingCard dash={dash} /> : null
    }
  }

  return (
    <div className="dash">
      {header}
      {period}
      <div className="dash__grid">
        {dash.empty && (
          <div className="dash__card dash__card--empty">
            <LUICard className="dash-card">
              <EmptyState
                icon="receipt"
                title={`Nothing logged in ${dash.periodLabel}`}
                message="Add a transaction to see where your money goes, or pick another period above."
              >
                <LUIButton size="lg" onClick={() => actions.create()}>
                  Add transaction
                </LUIButton>
              </EmptyState>
            </LUICard>
          </div>
        )}

        {dash.cards.map((card) => {
          const content = render(card)
          return (
            content && (
              <div key={card} className={`dash__card dash__card--${card}`}>
                {content}
              </div>
            )
          )
        })}
      </div>
    </div>
  )
}
