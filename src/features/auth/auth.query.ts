import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import {
  changePassword,
  deleteAccount,
  getProfile,
  login,
  register,
  updatePreferences,
  updateProfile,
} from './auth.api'
import type { IPreferencesBody, IProfile, RegisterConflictField } from './auth.types'

export const useLogin = () => useMutation({ mutationFn: login })

export const useRegister = () => useMutation({ mutationFn: register })

/** The field a signup was refused over because it's taken, if that's why. */
export function registerConflictField(error: unknown): RegisterConflictField | undefined {
  if (!isAxiosError<{ field?: RegisterConflictField }>(error)) return undefined
  return error.response?.status === 409 ? error.response.data?.field : undefined
}

// Query keys in one place so invalidation never drifts out of sync.
export const profileKeys = {
  me: ['me'] as const,
  /** Preference saves, counted so only the last of several quick ones refetches. */
  savePreferences: ['me', 'preferences'] as const,
}

/** The signed-in user's profile and preferences. */
export const useProfile = () => useQuery({ queryKey: profileKeys.me, queryFn: getProfile })

/**
 * The signed-in user's preferences, or `undefined` until the profile loads,
 * so nothing acts on a default the user may have changed.
 */
export const usePreferences = () => useProfile().data?.preferences

/** Whether the server refused a request because the password didn't match. */
export const isWrongPassword = (error: unknown) =>
  isAxiosError(error) && error.response?.status === 401

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (profile) => queryClient.setQueryData(profileKeys.me, profile),
  })
}

/** The profile with `body`'s preferences merged in, as the server merges them. */
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
 * switch moves before the server answers, and goes back if it refuses.
 */
export const useUpdatePreferences = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: profileKeys.savePreferences,
    mutationFn: updatePreferences,
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

export const useChangePassword = () => useMutation({ mutationFn: changePassword })

export const useDeleteAccount = () => useMutation({ mutationFn: deleteAccount })
