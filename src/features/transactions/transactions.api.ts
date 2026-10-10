import {
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type DocumentSnapshot,
  type QueryConstraint,
  type Transaction,
  type UpdateData,
} from 'firebase/firestore'
import { AppError } from '@/lib/errors'
import { MAX_BATCH_WRITES, db, toEntity, userCollection, userDoc } from '@/lib/firestore'
import {
  accountIdsOf,
  balanceEffects,
  combineEffects,
  compareNewestFirst,
  type BalanceEffects,
} from './transaction.domain'
import type { ITransaction, ITransactionBody, TransactionQuery } from './transaction.types'

// users/{uid}/transactions. Every write moves the balances of the accounts
// it touches with increment(), in the same atomic write, so a balance is
// always its opening balance plus its entries (docs/requirements.md §4).
// An account deleted since an entry was written has no balance to move.

const transactionDoc = (id: string) => userDoc('transactions', id)

/**
 * The stored entry as the app's type. `accountIds` (the accounts it touches,
 * kept so one query finds both sides of a transfer) stays in Firestore.
 */
function toTransaction(snapshot: DocumentSnapshot): ITransaction {
  const tx = toEntity<ITransaction & { accountIds?: string[] }>(snapshot)
  delete tx.accountIds
  return tx
}

/**
 * The matching transactions, newest first. Only one filter at a time is
 * used, so Firestore's single-field indexes answer every query; combining an
 * account or a rule with a date range would need a composite index.
 */
export const getTransactions = async (filter: TransactionQuery = {}) => {
  const constraints: QueryConstraint[] = []
  if (filter.from) constraints.push(where('date', '>=', filter.from))
  if (filter.to) constraints.push(where('date', '<=', filter.to))
  if (filter.accountId) constraints.push(where('accountIds', 'array-contains', filter.accountId))
  if (filter.recurringRuleId) {
    constraints.push(where('recurringRuleId', '==', filter.recurringRuleId))
  }
  const snapshot = await getDocs(query(userCollection('transactions'), ...constraints))
  return snapshot.docs.map(toTransaction).sort(compareNewestFirst)
}

export const getTransaction = async (id: string) => {
  const snapshot = await getDoc(transactionDoc(id))
  if (!snapshot.exists()) throw new AppError('Transaction not found', 'not-found')
  return toTransaction(snapshot)
}

/** The fields an entry is stored with. The currency is the source account's. */
export const transactionFields = (body: ITransactionBody, currency: string) => {
  const transfer = body.type === 'transfer'
  const fields = {
    type: body.type,
    amount: body.amount,
    currency,
    accountId: body.accountId,
    toAccountId: transfer ? body.toAccountId : null,
    categoryId: transfer ? null : body.categoryId,
    date: body.date,
    note: body.note?.trim() || null,
  }
  return { ...fields, accountIds: accountIdsOf(fields) }
}

/** The accounts' stored fields inside a Firestore transaction, `undefined` for a deleted one. */
export async function readAccounts(t: Transaction, ids: Iterable<string>) {
  const unique = [...new Set(ids)]
  const snapshots = await Promise.all(unique.map((id) => t.get(userDoc('accounts', id))))
  return new Map(unique.map((id, i) => [id, snapshots[i].data()]))
}

/** The ids of the accounts that still exist, from `readAccounts`. */
export const existing = (accounts: Map<string, unknown>) =>
  new Set([...accounts].filter(([, data]) => data !== undefined).map(([id]) => id))

/**
 * Checks what an entry needs before it's written: its accounts, and a
 * category of its own type. Resolves to the source account's currency.
 */
async function checkEntry(t: Transaction, body: ITransactionBody, accounts: Map<string, unknown>) {
  const source = accounts.get(body.accountId) as { currency: string } | undefined
  const target = body.toAccountId === null ? null : accounts.get(body.toAccountId)
  if (!source || (body.type === 'transfer' && !target)) {
    throw new AppError('That account was deleted. Pick another one.', 'not-found')
  }
  if (body.type !== 'transfer') {
    const category = body.categoryId && (await t.get(userDoc('categories', body.categoryId))).data()
    if (!category) throw new AppError('That category was deleted. Pick another one.', 'not-found')
    if (category.type !== body.type) throw new Error(`Pick an ${body.type} category`)
  }
  return source.currency
}

/** A Firestore transaction or batch: either can carry the balance moves. */
interface Updater {
  update(ref: DocumentReference, data: UpdateData<DocumentData>): unknown
}

/** Adds the balance moves for the accounts that still exist to a write. */
export function moveBalances(
  write: Updater,
  effects: BalanceEffects,
  accounts: ReadonlySet<string>,
) {
  for (const [id, delta] of effects) {
    if (delta === 0 || !accounts.has(id)) continue
    write.update(userDoc('accounts', id), {
      currentBalance: increment(delta),
      updatedAt: serverTimestamp(),
    })
  }
}

/** Writes the entry and moves every affected account balance in the same write. */
export const createTransaction = async (body: ITransactionBody) => {
  const ref = doc(userCollection('transactions'))
  await runTransaction(db, async (t) => {
    const accounts = await readAccounts(t, accountIdsOf(body))
    const currency = await checkEntry(t, body, accounts)
    t.set(ref, {
      ...transactionFields(body, currency),
      recurringRuleId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    moveBalances(t, balanceEffects(body), existing(accounts))
  })
  return getTransaction(ref.id)
}

/** An edit reverses what the old entry did to balances and applies the new one. */
export const updateTransaction = async (id: string, body: ITransactionBody) => {
  await runTransaction(db, async (t) => {
    const snapshot = await t.get(transactionDoc(id))
    if (!snapshot.exists()) throw new AppError('Transaction not found', 'not-found')
    const before = toTransaction(snapshot)
    const accounts = await readAccounts(t, [...accountIdsOf(before), ...accountIdsOf(body)])
    const currency = await checkEntry(t, body, accounts)
    t.update(transactionDoc(id), {
      ...transactionFields(body, currency),
      updatedAt: serverTimestamp(),
    })
    const effects = combineEffects([balanceEffects(before, -1), balanceEffects(body)])
    moveBalances(t, effects, existing(accounts))
  })
  return getTransaction(id)
}

/** Deletes the entry and takes what it did off the balances. */
export const deleteTransaction = async (id: string) => {
  await runTransaction(db, async (t) => {
    const snapshot = await t.get(transactionDoc(id))
    if (!snapshot.exists()) return
    const tx = toTransaction(snapshot)
    const accounts = await readAccounts(t, accountIdsOf(tx))
    t.delete(transactionDoc(id))
    moveBalances(t, balanceEffects(tx, -1), existing(accounts))
  })
}

/**
 * Deletes every transaction, undoing each one's effect on balances, so every
 * account ends at its opening balance. Each batch takes its own entries'
 * effects off, so one that fails leaves the balances matching what's left.
 * Accounts, categories, budgets and recurring rules stay. Resolves to how
 * many went.
 */
export const deleteAllTransactions = async () => {
  const [transactions, accounts] = await Promise.all([
    getDocs(userCollection('transactions')),
    getDocs(userCollection('accounts')),
  ])
  const accountIds = new Set(accounts.docs.map((d) => d.id))
  // Room in each batch for one balance update per account.
  const size = Math.max(50, MAX_BATCH_WRITES - accountIds.size)
  const all = transactions.docs.map(toTransaction)
  for (let i = 0; i < all.length; i += size) {
    const chunk = all.slice(i, i + size)
    const batch = writeBatch(db)
    for (const tx of chunk) batch.delete(transactionDoc(tx.id))
    moveBalances(batch, combineEffects(chunk.map((tx) => balanceEffects(tx, -1))), accountIds)
    await batch.commit()
  }
  return all.length
}
