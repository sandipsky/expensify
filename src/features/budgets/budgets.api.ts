import {
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { AppError } from '@/lib/errors'
import { db, toEntity, userCollection, userDoc } from '@/lib/firestore'
import type { BudgetAlert, IBudget, IBudgetBody } from './budget.types'

// users/{uid}/budgets. Figures are worked out on the device from the
// transactions; a budget only stores its settings and the last alert.

const budgetDoc = (id: string) => userDoc('budgets', id)

const notFound = () => new AppError('Budget not found', 'not-found')

export const getBudgets = async () => {
  const snapshot = await getDocs(userCollection('budgets'))
  return snapshot.docs.map((d) => toEntity<IBudget>(d))
}

const getBudget = async (id: string) => {
  const snapshot = await getDoc(budgetDoc(id))
  if (!snapshot.exists()) throw notFound()
  return toEntity<IBudget>(snapshot)
}

// The fields a form may set; the alert record, the paused flag and the
// timestamps belong to this module. An empty category list means every expense.
const budgetFields = (body: IBudgetBody) => ({
  name: body.name.trim(),
  amount: body.amount,
  period: body.period,
  categoryIds: [...new Set(body.categoryIds)],
  rollover: body.rollover,
  alertThresholds: [...new Set(body.alertThresholds)].sort((a, b) => a - b),
})

export const createBudget = async (body: IBudgetBody) => {
  const ref = doc(userCollection('budgets'))
  await setDoc(ref, {
    ...budgetFields(body),
    lastAlert: null,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return getBudget(ref.id)
}

export const updateBudget = async (id: string, body: IBudgetBody) => {
  await updateDoc(budgetDoc(id), { ...budgetFields(body), updatedAt: serverTimestamp() })
  return getBudget(id)
}

/** Pausing keeps the settings; it only stops tracking and alerts. */
export const setBudgetActive = async (id: string, active: boolean) => {
  await updateDoc(budgetDoc(id), { active, updatedAt: serverTimestamp() })
  return getBudget(id)
}

/**
 * Records that an alert was shown, so it isn't shown again that period,
 * whichever tab shows it. A lower threshold than the period already
 * reached, as a slower tab might send, changes nothing.
 */
export const recordBudgetAlert = async (id: string, alert: BudgetAlert) => {
  await runTransaction(db, async (t) => {
    const snapshot = await t.get(budgetDoc(id))
    if (!snapshot.exists()) throw notFound()
    const last = snapshot.data().lastAlert as BudgetAlert | null
    if (last && last.periodStart === alert.periodStart && last.threshold >= alert.threshold) return
    t.update(budgetDoc(id), {
      lastAlert: { periodStart: alert.periodStart, threshold: alert.threshold },
      updatedAt: serverTimestamp(),
    })
  })
  return getBudget(id)
}

/** Transactions aren't touched. */
export const deleteBudget = async (id: string) => {
  await deleteDoc(budgetDoc(id))
}
