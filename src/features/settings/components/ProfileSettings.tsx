import { useRef, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  LUIAvatar,
  LUIButton,
  LUICard,
  LUIEmailInput,
  LUIIcon,
  LUITextInput,
  useLUINotification,
} from '@lumen-ui/react'
import { useUpdateProfile } from '@/features/auth/auth.query'
import type { IProfile } from '@/features/auth/auth.types'
import { getApiErrorMessage } from '@/lib'
import { squareThumbnail } from '@/lib/files/image'
import { useSettingsActions } from '../settings.actions'
import { PHOTO_EDGE } from '../settings.labels'
import './ProfileSettings.scss'

interface ProfileSettingsProps {
  profile: IProfile
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(60, 'Use at most 60 characters'),
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email')
    .pipe(z.email('Enter an email address, like name@example.com')),
})

type ProfileFormValues = z.infer<typeof profileSchema>

/**
 * Settings › Profile: the photo, full name and email, the username (which
 * can't change, since it's what the user logs in with), and the password.
 * The photo saves as soon as it's picked; name and email save together.
 */
export const ProfileSettings = ({ profile }: ProfileSettingsProps) => {
  const notify = useLUINotification()
  const actions = useSettingsActions()
  const saveDetails = useUpdateProfile()
  const savePhoto = useUpdateProfile()
  const photoInput = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: profile.name, email: profile.email },
  })

  const onSubmit = (values: ProfileFormValues) => {
    saveDetails.mutate(values, {
      onSuccess: (saved) => {
        reset({ name: saved.name, email: saved.email })
        notify.success('Profile saved')
      },
      onError: (error) => notify.error('Could not save your profile', getApiErrorMessage(error)),
    })
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
        onError: (error) => notify.error('Could not save your photo', getApiErrorMessage(error)),
      },
    )
  }

  const removePhoto = () => {
    savePhoto.mutate(
      { photoUrl: null },
      {
        onSuccess: () => notify.success('Photo removed'),
        onError: (error) => notify.error('Could not remove your photo', getApiErrorMessage(error)),
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
            <LUIEmailInput
              label="Email"
              autoComplete="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          <div className="profile-username">
            <LUITextInput label="Username" value={profile.username} readOnly disabled />
            <p className="settings-card__hint">You log in with it, so it can't be changed.</p>
          </div>

          <div className="settings-card__actions">
            <LUIButton size="lg" type="submit" disabled={!isDirty || saveDetails.isPending}>
              {saveDetails.isPending ? 'Saving...' : 'Save changes'}
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
