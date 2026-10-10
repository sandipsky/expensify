import {
  Timestamp,
  collection,
  connectFirestoreEmulator,
  doc,
  initializeFirestore,
  writeBatch,
  type DocumentSnapshot,
  type WriteBatch,
} from 'firebase/firestore'
import { config } from '@/config/env'
import { AppError } from './errors'
import { auth, firebaseApp } from './firebase'

// Cloud Firestore, and the paths and conversions the features' *.api.ts
// files share. Every user's data lives under users/{uid}, and
// firestore.rules lets only that user in. Only the *.api.ts files import this
// module, and the *.query.ts hooks load those on first use, so the SDK stays
// out of the first download: the login page starts without it.

// `undefined` fields are left out of a write instead of failing it.
export const db = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true })

if (config.useEmulators) connectFirestoreEmulator(db, '127.0.0.1', 8080)

/** The collections under users/{uid}, in the order deleting the account removes them. */
export const USER_COLLECTIONS = [
  'transactions',
  'recurringRules',
  'budgets',
  'accounts',
  'categories',
] as const

export type UserCollection = (typeof USER_COLLECTIONS)[number]

/** The logged-in user's id. Throws while logged out. */
export function currentUid(): string {
  const uid = auth.currentUser?.uid
  if (!uid) throw new AppError("You're logged out. Log in again.", 'signed-out')
  return uid
}

export const userCollection = (name: UserCollection) =>
  collection(db, 'users', currentUid(), name)

export const userDoc = (name: UserCollection, id: string) =>
  doc(db, 'users', currentUid(), name, id)

/** A stored timestamp as a fixed-width UTC ISO string, which sorts as text. */
export function isoOf(value: unknown): string {
  return (value instanceof Timestamp ? value.toDate() : new Date()).toISOString()
}

/**
 * A stored document as the app's type: its fields, its id, and the
 * timestamps as ISO strings. A write the server hasn't stamped yet reads as now.
 */
export function toEntity<T>(snapshot: DocumentSnapshot): T {
  const data = snapshot.data({ serverTimestamps: 'estimate' }) ?? {}
  return {
    ...data,
    id: snapshot.id,
    createdAt: isoOf(data.createdAt),
    updatedAt: isoOf(data.updatedAt),
  } as T
}

/** Firestore caps a batch at 500 writes; bulk writes stay under it. */
export const MAX_BATCH_WRITES = 450

/** Commits the writes in batches under Firestore's cap, one batch after another. */
export async function commitInBatches(writes: readonly ((batch: WriteBatch) => void)[]) {
  for (let i = 0; i < writes.length; i += MAX_BATCH_WRITES) {
    const batch = writeBatch(db)
    for (const write of writes.slice(i, i + MAX_BATCH_WRITES)) write(batch)
    await batch.commit()
  }
}
