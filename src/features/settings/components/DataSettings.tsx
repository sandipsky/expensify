import { LUIButton, LUICard, LUIIcon } from '@lumen-ui/react'
import { useSettingsActions } from '../settings.actions'

/** Settings › Data and privacy: deleting every transaction, or the whole account. */
export const DataSettings = () => {
  const actions = useSettingsActions()

  return (
    <section className="settings-section" aria-labelledby="data-heading">
      <h2 className="settings-section__title" id="data-heading">
        Data and privacy
      </h2>

      <LUICard title="Delete all transactions" padding="lg">
        <div className="settings-card">
          <p className="settings-card__text">
            Start the history over: every transaction goes, and each account's balance goes back to
            what it was before them. Accounts, categories, budgets and recurring rules stay.
          </p>
          <div className="settings-card__actions">
            <LUIButton variant="danger" size="lg" onClick={actions.deleteAllTransactions}>
              <LUIIcon name="trash" color="inherit" />
              Delete all transactions
            </LUIButton>
          </div>
        </div>
      </LUICard>

      <LUICard title="Delete account" padding="lg">
        <div className="settings-card">
          <p className="settings-card__text">
            Deletes everything you entered, then your profile and your login. This can't be undone.
          </p>
          <div className="settings-card__actions">
            <LUIButton variant="danger" size="lg" onClick={actions.deleteAccount}>
              <LUIIcon name="trash" color="inherit" />
              Delete account
            </LUIButton>
          </div>
        </div>
      </LUICard>
    </section>
  )
}
