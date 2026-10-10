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
  type Transaction,
} from 'firebase/firestore'
import { accountIdsOf, balanceEffects, combineEffects } from '@/features/transactions/transaction.domain'
import type { ITransactionBody } from '@/features/transactions/transaction.types'
import {
  existing,
  moveBalances,
  readAccounts,
  transactionFields,
} from '@/features/transactions/transactions.api'
import { AppError } from '@/lib/errors'
import { db, toEntity, userCollection, userDoc } from '@/lib/firestore'
import type { IRecurringRule, IRecurringRuleBody, OccurrencesBody } from './recurring.types'

// users/{uid}/recurringRules. The device works out the dates; adding or
// skipping one happens in a Firestore transaction that re-reads the rule, so
// a date is handled once however many tabs try at the same time.

const ruleDoc = (id: string) => userDoc('recurringRules', id)

const notFound = () => new AppError('Recurring rule not found', 'not-found')

export const getRecurringRules = async () => {
  const snapshot = await getDocs(userCollection('recurringRules'))
  return snapshot.docs.map((d) => toEntity<IRecurringRule>(d))
}

const getRecurringRule = async (id: string) => {
  const snapshot = await getDoc(ruleDoc(id))
  if (!snapshot.exists()) throw notFound()
  return toEntity<IRecurringRule>(snapshot)
}

// The fields a form may set, with the ones other frequencies and ends don't
// use cleared. The count of entries added, the paused flag and the
// timestamps belong to this module.
const ruleFields = (body: IRecurringRuleBody) => {
  const { template } = body
  const transfer = template.type === 'transfer'
  return {
    template: {
      type: template.type,
      amount: template.amount,
      accountId: template.accountId,
      toAccountId: transfer ? template.toAccountId : null,
      categoryId: transfer ? null : template.categoryId,
      note: template.note?.trim() || null,
    },
    frequency: body.frequency,
    interval: body.interval,
    weekdays: body.frequency === 'weekly' ? [...new Set(body.weekdays)].sort((a, b) => a - b) : [],
    dayOfMonth: body.frequency === 'monthly' ? body.dayOfMonth : null,
    startDate: body.startDate,
    endType: body.endType,
    endDate: body.endType === 'until' ? body.endDate : null,
    maxCount: body.endType === 'count' ? body.maxCount : null,
    mode: body.mode,
    nextDueDate: body.nextDueDate,
  }
}

export const createRecurringRule = async (body: IRecurringRuleBody) => {
  const ref = doc(userCollection('recurringRules'))
  await setDoc(ref, {
    ...ruleFields(body),
    occurrences: 0,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return getRecurringRule(ref.id)
}

/** Reaches future entries only; the ones already added stay as they are. */
export const updateRecurringRule = async (id: string, body: IRecurringRuleBody) => {
  await updateDoc(ruleDoc(id), { ...ruleFields(body), updatedAt: serverTimestamp() })
  return getRecurringRule(id)
}

/** Resuming passes the date to pick up from, so dates passed while paused are left out. */
export const setRecurringRuleActive = async (id: string, active: boolean, nextDueDate?: string) => {
  await updateDoc(ruleDoc(id), {
    active,
    ...(nextDueDate !== undefined && { nextDueDate }),
    updatedAt: serverTimestamp(),
  })
  return getRecurringRule(id)
}

/**
 * The rule, read inside the transaction. Occurrences are handled oldest
 * first, so a write must start at the rule's next due date; anything else
 * was confirmed, skipped or added already, in another tab or by the runner.
 */
async function readDueRule(t: Transaction, id: string, date: string) {
  const snapshot = await t.get(ruleDoc(id))
  if (!snapshot.exists()) throw notFound()
  const rule = toEntity<IRecurringRule>(snapshot)
  if (!rule.active || rule.nextDueDate !== date) {
    throw new AppError('Already handled, perhaps in another tab', 'stale')
  }
  return rule
}

/**
 * Adds the entries due on `dates` and moves the rule on, in one write. An
 * `entry` replaces the template for a single date, as edited before
 * confirming. Every entry moves its account balances, like any other.
 * Refuses as `stale` when another tab already handled the first date.
 */
export const addOccurrences = async (id: string, body: OccurrencesBody) => {
  const refs = body.dates.map(() => doc(userCollection('transactions')))
  await runTransaction(db, async (t) => {
    const rule = await readDueRule(t, id, body.dates[0])
    const source = body.entry ?? rule.template
    const accounts = await readAccounts(t, accountIdsOf(source))
    const from = accounts.get(source.accountId) as { currency: string } | undefined
    if (!from || (source.toAccountId !== null && !accounts.get(source.toAccountId))) {
      throw new AppError(
        'An account this rule uses was deleted. Edit the rule to pick another one.',
        'not-found',
      )
    }

    // The template's category may have been deleted since; the entries keep
    // it, as other entries of a deleted category do.
    const entries: ITransactionBody[] = body.dates.map((date) => ({
      ...rule.template,
      ...body.entry,
      // An edited entry may move its own date; the schedule date still counts as handled.
      date: body.entry ? body.entry.date : date,
    }))
    entries.forEach((entry, i) => {
      t.set(refs[i], {
        ...transactionFields(entry, from.currency),
        recurringRuleId: id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    })
    moveBalances(t, combineEffects(entries.map((e) => balanceEffects(e))), existing(accounts))
    t.update(ruleDoc(id), {
      occurrences: increment(body.dates.length),
      nextDueDate: body.nextDueDate,
      updatedAt: serverTimestamp(),
    })
  })
}

/** Passes over the entry due on `date`; refuses as `stale` when it was already handled. */
export const skipOccurrence = async (id: string, date: string, nextDueDate: string) => {
  await runTransaction(db, async (t) => {
    await readDueRule(t, id, date)
    t.update(ruleDoc(id), { nextDueDate, updatedAt: serverTimestamp() })
  })
  return getRecurringRule(id)
}

/** The entries it already added stay. */
export const deleteRecurringRule = async (id: string) => {
  await deleteDoc(ruleDoc(id))
}
