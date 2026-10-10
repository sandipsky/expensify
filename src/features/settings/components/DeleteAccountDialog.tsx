import { useState } from 'react'
import { LUIButton, LUIPasswordInput, LUITextInput, type ModalRef } from '@lumen-ui/react'
import { isWrongPassword, useDeleteAccount } from '@/features/auth/auth.query'
import { getApiErrorMessage } from '@/lib'
import { DELETE_PHRASE } from '../settings.labels'

interface DeleteAccountDialogProps {
  /** Closed with `true` once the account is gone; the caller signs out. */
  modalRef: ModalRef<boolean>
}

/**
 * The last step before deleting the account: the user types DELETE, so it
 * can't happen by a slip, and their password, so only they can. The dialog
 * can't be dismissed while the delete runs.
 */
export const DeleteAccountDialog = ({ modalRef }: DeleteAccountDialogProps) => {
  const deleteAccount = useDeleteAccount()
  const [phrase, setPhrase] = useState('')
  const [password, setPassword] = useState('')

  const ready = phrase.trim() === DELETE_PHRASE && password.length > 0 && !deleteAccount.isPending

  const submit = () => {
    if (!ready) return
    modalRef.setDisableClose(true)
    deleteAccount.mutate(password, {
      onSuccess: () => modalRef.close(true),
      onSettled: () => modalRef.setDisableClose(false),
    })
  }

  const error = deleteAccount.error
  const wrongPassword = isWrongPassword(error)

  return (
    <form
      className="sheet-form"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      noValidate
    >
      <h2 className="sheet-form__title">Delete your account?</h2>
      <p className="sheet-form__intro">
        This deletes your accounts, transactions, categories, budgets and recurring rules, then
        your profile and your login. It can't be undone.
      </p>

      <div className="sheet-form__fields">
        <LUITextInput
          label={`Type ${DELETE_PHRASE} to confirm`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          autoFocus
          value={phrase}
          onChange={(event) => setPhrase(event.target.value)}
        />

        <LUIPasswordInput
          label="Your password"
          autoComplete="current-password"
          value={password}
          error={wrongPassword ? "That password isn't right" : undefined}
          onChange={(event) => {
            setPassword(event.target.value)
            // Typing again clears the last attempt's error.
            if (error) deleteAccount.reset()
          }}
        />

        {error && !wrongPassword && (
          <div className="alert error">{getApiErrorMessage(error)}</div>
        )}
      </div>

      <div className="sheet-form__actions">
        <LUIButton
          variant="outlined"
          size="lg"
          disabled={deleteAccount.isPending}
          onClick={() => modalRef.close(false)}
        >
          Cancel
        </LUIButton>
        <LUIButton variant="danger" size="lg" type="submit" disabled={!ready}>
          {deleteAccount.isPending ? 'Deleting...' : 'Delete account'}
        </LUIButton>
      </div>
    </form>
  )
}
