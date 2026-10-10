import { useRef, type ChangeEvent } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LUIAvatar,
  LUIButton,
  LUICard,
  LUIEmailInput,
  LUIIcon,
  LUIPasswordInput,
  LUITextInput,
  useLUINotification,
} from '@lumen-ui/react'
import {
  isWrongPassword,
  registerConflictField,
  useChangeEmail,
  useUpdateProfile,
} from '@/features/auth/auth.query'
import type { IProfile } from '@/features/auth/auth.types'
import { getErrorMessage } from '@/lib'
import { squareThumbnail } from '@/lib/files/image'
import { useSettingsActions } from '../settings.actions'
import { PHOTO_EDGE } from '../settings.labels'
import './ProfileSettings.scss'

interface ProfileSettingsProps {
  profile: IProfile
}

/** How emails compare: trimmed and ignoring case, as logins do. */
const emailKey = (email: string) => email.trim().toLowerCase()

// A new email needs the password too: the login only changes once it proves it's the user.
const profileSchema = (currentEmail: string) =>
  z
    .object({
      name: z.string().trim().min(1, 'Enter your name').max(60, 'Use at most 60 characters'),
      email: z
        .string()
        .trim()
        .min(1, 'Enter your email')
        .pipe(z.email('Enter an email address, like name@example.com')),
      password: z.string(),
    })
    .superRefine((values, ctx) => {
      if (emailKey(values.email) !== emailKey(currentEmail) && !values.password) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'Enter your password to change your email',
        })
      }
    })

type ProfileFormValues = z.infer<ReturnType<typeof profileSchema>>

/**
 * Settings › Profile: the photo, full name and email, the username (which
 * can't change, since the user logs in with it), and the password. The
 * photo saves as soon as it's picked; name and email save together. A new
 * email gets a verification link, and the login switches once it's opened.
 */
export const ProfileSettings = ({ profile }: ProfileSettingsProps) => {
  const notify = useLUINotification()
  const actions = useSettingsActions()
  const saveName = useUpdateProfile()
  const changeEmail = useChangeEmail()
  const savePhoto = useUpdateProfile()
  const photoInput = useRef<HTMLInputElement>(null)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema(profile.email)),
    defaultValues: { name: profile.name, email: profile.email, password: '' },
  })

  const email = useWatch({ control, name: 'email' })
  const emailEdited = emailKey(email) !== emailKey(profile.email)
  const saving = saveName.isPending || changeEmail.isPending

  const onSubmit = async (values: ProfileFormValues) => {
    const nameEdited = values.name.trim() !== profile.name
    const newEmail = emailKey(values.email) !== emailKey(profile.email) ? values.email.trim() : null
    try {
      if (nameEdited) await saveName.mutateAsync({ name: values.name })
      if (newEmail) await changeEmail.mutateAsync({ email: newEmail, password: values.password })
    } catch (error) {
      if (isWrongPassword(error)) {
        setError('password', { message: "That password isn't right" }, { shouldFocus: true })
      } else if (registerConflictField(error) === 'email') {
        setError('email', { message: getErrorMessage(error) }, { shouldFocus: true })
      } else {
        notify.error('Could not save your profile', getErrorMessage(error))
      }
      return
    }
    // The email field goes back to the login's email until the link is opened.
    // keepFieldsRef writes the values into the inputs: the compiled JSX keeps
    // its ref callbacks, so the fields wouldn't register again to pick them up.
    reset({ name: values.name.trim(), email: profile.email, password: '' }, { keepFieldsRef: true })
    if (newEmail) {
      notify.success('Check your inbox', `We sent a link to ${newEmail}. Your email changes once you open it.`)
    } else {
      notify.success('Profile saved')
    }
  }

  /** Scales the picked image down to a small square and saves it at once. */
  const pickPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Cleared, so picking the same file again still counts as a change.
    event.target.value = ''
    if (!file) return
    const photoUrl = await squareThumbnail(file, PHOTO_EDGE)
    if (!photoUrl) {
      notify.error("Couldn't read that image", 'Try a JPEG or PNG.')
      return
    }
    savePhoto.mutate(
      { photoUrl },
      {
        onSuccess: () => notify.success('Photo updated'),
        onError: (error) => notify.error('Could not save your photo', getErrorMessage(error)),
      },
    )
  }

  const removePhoto = () => {
    savePhoto.mutate(
      { photoUrl: null },
      {
        onSuccess: () => notify.success('Photo removed'),
        onError: (error) => notify.error('Could not remove your photo', getErrorMessage(error)),
      },
    )
  }

  return (
    <section className="settings-section" aria-labelledby="profile-heading">
      <h2 className="settings-section__title" id="profile-heading">
        Profile
      </h2>

      <LUICard title="You" padding="lg">
        <form className="settings-card" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="profile-identity">
            <LUIAvatar imageUrl={profile.photoUrl} name={profile.name} size="64px" />
            <div className="profile-identity__actions">
              <input
                ref={photoInput}
                className="visually-hidden"
                type="file"
                accept="image/*"
                tabIndex={-1}
                aria-label="Choose a profile photo"
                onChange={pickPhoto}
              />
              <LUIButton
                variant="outlined"
                disabled={savePhoto.isPending}
                onClick={() => photoInput.current?.click()}
              >
                <LUIIcon name="image" color="inherit" size={18} />
                {profile.photoUrl ? 'Change photo' : 'Add photo'}
              </LUIButton>
              {profile.photoUrl && (
                <LUIButton variant="ghost" disabled={savePhoto.isPending} onClick={removePhoto}>
                  Remove
                </LUIButton>
              )}
            </div>
          </div>

          <div className="settings-card__fields">
            <LUITextInput
              label="Full name"
              placeholder="Your name"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />
            <div className="profile-email">
              <LUIEmailInput
                label="Email"
                autoComplete="email"
                placeholder="name@example.com"
                error={errors.email?.message}
                {...register('email')}
              />
              {profile.pendingEmail && !emailEdited && (
                <p className="settings-card__hint">
                  Waiting on the link we sent to {profile.pendingEmail}. Your email changes once
                  you open it.
                </p>
              )}
            </div>
            {emailEdited && (
              <div className="profile-email">
                <LUIPasswordInput
                  label="Your password"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  {...register('password')}
                />
                <p className="settings-card__hint">
                  We'll send a link to the new email. It switches once you open it.
                </p>
              </div>
            )}
          </div>

          {profile.username && (
            <div className="profile-username">
              <LUITextInput label="Username" value={profile.username} readOnly disabled />
              <p className="settings-card__hint">You log in with it, so it can't be changed.</p>
            </div>
          )}

          <div className="settings-card__actions">
            <LUIButton size="lg" type="submit" disabled={!isDirty || saving}>
              {saving ? 'Saving...' : 'Save changes'}
            </LUIButton>
          </div>
        </form>
      </LUICard>

      <LUICard title="Password" padding="lg">
        <div className="settings-card">
          <p className="settings-card__text">
            Change the password you log in with. You'll need your current one.
          </p>
          <div className="settings-card__actions">
            <LUIButton variant="outlined" size="lg" onClick={actions.changePassword}>
              <LUIIcon name="lock" color="inherit" size={18} />
              Change password
            </LUIButton>
          </div>
        </div>
      </LUICard>
    </section>
  )
}
