import { apiClient } from '@/lib'
import type { ITransaction, ITransactionBody, TransactionQuery } from './transaction.types'

/** The matching transactions, newest first. */
export const getTransactions = async (query: TransactionQuery = {}) => {
  const res = await apiClient.get<ITransaction[]>('/transactions', { params: query })
  return res.data
}

export const getTransaction = async (id: number) => {
  const res = await apiClient.get<ITransaction>(`/transactions/${id}`)
  return res.data
}

/** The server moves every affected account balance in the same write. */
export const createTransaction = async (body: ITransactionBody) => {
  const res = await apiClient.post<ITransaction>('/transactions', body)
  return res.data
}

export const updateTransaction = async (id: number, body: ITransactionBody) => {
  const res = await apiClient.put<ITransaction>(`/transactions/${id}`, body)
  return res.data
}

export const deleteTransaction = async (id: number) => {
  await apiClient.delete(`/transactions/${id}`)
}

/** Deletes every transaction, undoing each one's effect on balances. Resolves to how many went. */
export const deleteAllTransactions = async () => {
  const res = await apiClient.delete<{ deleted: number }>('/transactions')
  return res.data.deleted
}
