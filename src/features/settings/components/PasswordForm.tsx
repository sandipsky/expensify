import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LUIButton, LUIPasswordInput, useLUINotification } from '@lumen-ui/react'
import { isWrongPassword, useChangePassword } from '@/features/auth/auth.query'
import { MIN_PASSWORD_LENGTH } from '@/features/auth/auth.types'
import type { SheetHandle } from '@/components/sheet'
import { getApiErrorMessage } from '@/lib'

interface PasswordFormProps {
  /** The sheet this form opened in; closed with `true` once the password changed. */
  sheet: SheetHandle<boolean>
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`),
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Pick a password different from the current one',
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

/**
 * Change password, in a sheet: the current one proves it's the user, then the
 * new one replaces it. A wrong current password shows on its field.
 */
export const PasswordForm = ({ sheet }: PasswordFormProps) => {
  const notify = useLUINotification()
  const changePassword = useChangePassword()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  })

  const onSubmit = (values: PasswordFormValues) => {
    changePassword.mutate(values, {
      onSuccess: () => {
        notify.success('Password changed', 'Use the new one next time you log in.')
        sheet.close(true)
      },
      onError: (error) => {
        if (isWrongPassword(error)) {
          setError('currentPassword', { message: "That password isn't right" }, { shouldFocus: true })
        }
      },
    })
  }

  // A wrong current password shows on its field instead.
  const saveError =
    changePassword.error && !isWrongPassword(changePassword.error) ? changePassword.error : null

  return (
    <form className="sheet-form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h2 className="sheet-form__title">Change password</h2>

      <div className="sheet-form__fields">
        <LUIPasswordInput
          label="Current password"
          autoComplete="current-password"
          autoFocus
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />

        <LUIPasswordInput
          label="New password"
          autoComplete="new-password"
          showRules
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        {saveError && <div className="alert error">{getApiErrorMessage(saveError)}</div>}
      </div>

      <div className="sheet-form__actions">
        <LUIButton variant="outlined" size="lg" onClick={() => sheet.close()}>
          Cancel
        </LUIButton>
        <LUIButton size="lg" type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Saving...' : 'Change password'}
        </LUIButton>
      </div>
    </form>
  )
}
