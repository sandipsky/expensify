import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAppError } from '@/lib/errors'
import type {
  IChangeEmailBody,
  IChangePasswordBody,
  ILoginBody,
  IPreferencesBody,
  IProfile,
  IProfileBody,
  IRegisterBody,
  RegisterConflictField,
} from './auth.types'

// Loaded on first use, and the Firestore SDK with it, so the login page starts
// without it (src/lib/firestore.ts).
const api = () => import('./auth.api')

export const useLogin = () =>
  useMutation({ mutationFn: async (body: ILoginBody) => (await api()).login(body) })

export const useRegister = () =>
  useMutation({ mutationFn: async (body: IRegisterBody) => (await api()).register(body) })

/** The field a signup was refused over because it's taken, if that's why. */
export function registerConflictField(error: unknown): RegisterConflictField | undefined {
  return isAppError(error, 'taken') ? (error.field as RegisterConflictField) : undefined
}

// Query keys in one place so invalidation never drifts out of sync.
export const profileKeys = {
  me: ['me'] as const,
  /** Preference saves, counted so only the last of several quick ones refetches. */
  savePreferences: ['me', 'preferences'] as const,
}

/** The signed-in user's profile and preferences. */
export const useProfile = () =>
  useQuery({ queryKey: profileKeys.me, queryFn: async () => (await api()).getProfile() })

/**
 * The signed-in user's preferences, or `undefined` until the profile loads,
 * so nothing acts on a default the user may have changed.
 */
export const usePreferences = () => useProfile().data?.preferences

/** Whether a change was refused because the password didn't match. */
export const isWrongPassword = (error: unknown) => isAppError(error, 'wrong-password')

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: IProfileBody) => (await api()).updateProfile(body),
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.me, profile),
  })
}

/** Sends the new email its verification link; the profile shows it as pending until then. */
export const useChangeEmail = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: IChangeEmailBody) => (await api()).changeEmail(body),
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.me, profile),
  })
}

/** The profile with `body`'s preferences merged in, as the save merges them. */
function withPreferences(profile: IProfile, body: IPreferencesBody): IProfile {
  const { preferences } = profile
  return {
    ...profile,
    preferences: {
      theme: body.theme ?? preferences.theme,
      notifications: { ...preferences.notifications, ...body.notifications },
    },
  }
}

/**
 * Saves preferences. The cached profile changes at once, so a theme or a
 * switch moves before Firestore answers, and goes back if it refuses.
 */
export const useUpdatePreferences = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: profileKeys.savePreferences,
    mutationFn: async (body: IPreferencesBody) => (await api()).updatePreferences(body),
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: profileKeys.me })
      const previous = queryClient.getQueryData<IProfile>(profileKeys.me)
      if (previous) queryClient.setQueryData(profileKeys.me, withPreferences(previous, body))
      return { previous }
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(profileKeys.me, context.previous)
    },
    onSettled: () => {
      // Refetching while another save is in flight would flick its change back for a moment.
      if (queryClient.isMutating({ mutationKey: profileKeys.savePreferences }) === 1) {
        return queryClient.invalidateQueries({ queryKey: profileKeys.me })
      }
    },
  })
}

export const useChangePassword = () =>
  useMutation({
    mutationFn: async (body: IChangePasswordBody) => (await api()).changePassword(body),
  })

export const useDeleteAccount = () =>
  useMutation({ mutationFn: async (password: string) => (await api()).deleteAccount(password) })
