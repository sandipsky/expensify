import { apiClient } from '@/lib'
import type {
  IChangePasswordBody,
  ILoginBody,
  ILoginResponse,
  IPreferencesBody,
  IProfile,
  IProfileBody,
} from './auth.types'

export const login = async (body: ILoginBody) => {
  const res = await apiClient.post<ILoginResponse>('/auth/login', body)
  return res.data
}

export const getProfile = async () => {
  const res = await apiClient.get<IProfile>('/me')
  return res.data
}

export const updateProfile = async (body: IProfileBody) => {
  const res = await apiClient.patch<IProfile>('/me', body)
  return res.data
}

export const updatePreferences = async (body: IPreferencesBody) => {
  const res = await apiClient.patch<IProfile>('/me/preferences', body)
  return res.data
}

/** Answers 401 when the current password is wrong. */
export const changePassword = async (body: IChangePasswordBody) => {
  await apiClient.post('/me/password', body)
}

/** Deletes the user and all their data. Answers 401 when the password is wrong. */
export const deleteAccount = async (password: string) => {
  await apiClient.delete('/me', { data: { password } })
}
