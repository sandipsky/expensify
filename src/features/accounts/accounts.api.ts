import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { AppError } from '@/lib/errors'
import { db, toEntity, userCollection, userDoc } from '@/lib/firestore'
import type { IAccount, IAccountBody } from './account.types'

// users/{uid}/accounts. The current balance only ever moves by increment():
// here when the opening balance changes, and in transactions.api.ts and
// recurring.api.ts when an entry is written.

const accountDoc = (id: string) => userDoc('accounts', id)

const notFound = () => new AppError('Account not found', 'not-found')

/** Every account, archived ones too, in list order. */
export const getAccounts = async () => {
  const snapshot = await getDocs(userCollection('accounts'))
  return snapshot.docs.map((d) => toEntity<IAccount>(d)).sort((a, b) => a.sortOrder - b.sortOrder)
}

export const getAccount = async (id: string) => {
  const snapshot = await getDoc(accountDoc(id))
  if (!snapshot.exists()) throw notFound()
  return toEntity<IAccount>(snapshot)
}

// The fields a form may set; the rest belong to this module.
const accountFields = (body: IAccountBody) => ({
  name: body.name.trim(),
  type: body.type,
  currency: body.currency,
  openingBalance: body.openingBalance,
  creditLimit: body.type === 'credit_card' && body.creditLimit ? body.creditLimit : null,
  icon: body.icon,
  color: body.color,
  includeInTotal: body.includeInTotal,
})

/** The current balance starts at the opening balance; the account goes to the end of the list. */
export const createAccount = async (body: IAccountBody) => {
  const accounts = await getAccounts()
  const ref = doc(userCollection('accounts'))
  await setDoc(ref, {
    ...accountFields(body),
    currentBalance: body.openingBalance,
    archived: false,
    sortOrder: Math.max(-1, ...accounts.map((a) => a.sortOrder)) + 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return getAccount(ref.id)
}

/** A new opening balance shifts the current balance by the difference, in the same write. */
export const updateAccount = async (id: string, body: IAccountBody) => {
  await runTransaction(db, async (tx) => {
    const snapshot = await tx.get(accountDoc(id))
    if (!snapshot.exists()) throw notFound()
    const delta = body.openingBalance - (snapshot.data().openingBalance as number)
    tx.update(accountDoc(id), {
      ...accountFields(body),
      ...(delta !== 0 && { currentBalance: increment(delta) }),
      updatedAt: serverTimestamp(),
    })
  })
  return getAccount(id)
}

/** Archived accounts leave pickers and the total but keep their history. */
export const setAccountArchived = async (id: string, archived: boolean) => {
  await updateDoc(accountDoc(id), { archived, updatedAt: serverTimestamp() })
  return getAccount(id)
}

/** Moves the current balance to what the bank, card or wallet really shows. */
export const reconcileAccount = async (id: string, actualBalance: number) => {
  await updateDoc(accountDoc(id), { currentBalance: actualBalance, updatedAt: serverTimestamp() })
  return getAccount(id)
}

/** Its entries stay, and show it as a deleted account. */
export const deleteAccount = async (id: string) => {
  await deleteDoc(accountDoc(id))
}
