import { apiClient } from '@/lib'
import type { IAccount, IAccountBody } from './account.types'

export const getAccounts = async () => {
  const res = await apiClient.get<IAccount[]>('/accounts')
  return res.data
}

export const getAccount = async (id: number) => {
  const res = await apiClient.get<IAccount>(`/accounts/${id}`)
  return res.data
}

export const createAccount = async (body: IAccountBody) => {
  const res = await apiClient.post<IAccount>('/accounts', body)
  return res.data
}

/** A new opening balance shifts the current balance by the difference, server side. */
export const updateAccount = async (id: number, body: IAccountBody) => {
  const res = await apiClient.put<IAccount>(`/accounts/${id}`, body)
  return res.data
}

export const setAccountArchived = async (id: number, archived: boolean) => {
  const res = await apiClient.patch<IAccount>(`/accounts/${id}/archived`, { archived })
  return res.data
}

/** Moves the current balance to what the bank, card or wallet really shows. */
export const reconcileAccount = async (id: number, actualBalance: number) => {
  const res = await apiClient.post<IAccount>(`/accounts/${id}/reconcile`, { actualBalance })
  return res.data
}

export const deleteAccount = async (id: number) => {
  await apiClient.delete(`/accounts/${id}`)
}
