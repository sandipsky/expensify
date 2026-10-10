// Checks firestore.rules against the Auth and Firestore emulators: what the
// app writes is allowed, and another user's data, a second username and
// malformed documents are refused. Start `npm run emulators`, then run
// `npm run test:rules`; it loads firestore.rules as the file is now.
// Add a case here with every rules change.
const { readFileSync } = require('node:fs')
const { join } = require('node:path')
const { initializeApp, deleteApp } = require('firebase/app')
const authSdk = require('firebase/auth')
const fs = require('firebase/firestore')

// The SDK logs every refused write; the refusals here are the point.
fs.setLogLevel('silent')

// The ports in firebase.json. The documents go in a project of their own, so
// the app's data in the same emulators (project demo-expensify) is never
// touched, and each run starts that project empty.
const FIRESTORE = '127.0.0.1:8080'
const AUTH = '127.0.0.1:9099'
const PROJECT = 'demo-rules-test'

// The Auth emulator keeps every login under its default project, whichever
// project asks, so the logins here are unique per run and deleted at the end.
const RUN = Date.now().toString(36)
const ALICE = `alice.${RUN}@rules.test`
const BOB = `bob.${RUN}@rules.test`
const created = []

async function deleteLogins() {
  await Promise.all(created.map((user) => authSdk.deleteUser(user).catch(() => undefined)))
}

let passed = 0
let failed = 0
const results = []

function client(name) {
  const app = initializeApp({ apiKey: 'demo-api-key', projectId: PROJECT, authDomain: 'x' }, name)
  const auth = authSdk.getAuth(app)
  authSdk.connectAuthEmulator(auth, `http://${AUTH}`, { disableWarnings: true })
  const db = fs.initializeFirestore(app, {})
  const [host, port] = FIRESTORE.split(':')
  fs.connectFirestoreEmulator(db, host, Number(port))
  return { app, auth, db }
}

async function expectOk(label, fn) {
  try {
    await fn()
    passed++
    results.push(`ok    ${label}`)
  } catch (e) {
    failed++
    results.push(`FAIL  ${label} (expected ok): ${e.code || e.message}`)
  }
}

async function expectDenied(label, fn) {
  try {
    await fn()
    failed++
    results.push(`FAIL  ${label} (expected permission-denied, was allowed)`)
  } catch (e) {
    if (e.code === 'permission-denied') {
      passed++
      results.push(`ok    ${label} (denied)`)
    } else {
      failed++
      results.push(`FAIL  ${label}: ${e.code || e.message}`)
    }
  }
}

const ts = () => fs.serverTimestamp()
const prefs = {
  theme: 'system',
  notifications: { dailyReminder: false, reminderTime: '20:00', budgetAlerts: true, billReminders: true },
}
const profile = (name, username, email) => ({
  name,
  username,
  email,
  pendingEmail: null,
  photoUrl: null,
  preferences: prefs,
  createdAt: ts(),
  updatedAt: ts(),
})
const account = (over = {}) => ({
  name: 'Cash',
  type: 'cash',
  currency: 'NPR',
  openingBalance: 100.5,
  currentBalance: 100.5,
  creditLimit: null,
  icon: 'money',
  color: '#36B37E',
  includeInTotal: true,
  archived: false,
  sortOrder: 0,
  createdAt: ts(),
  updatedAt: ts(),
  ...over,
})
const category = (over = {}) => ({
  name: 'Food',
  type: 'expense',
  icon: 'category',
  color: '#EA580C',
  archived: false,
  sortOrder: 0,
  createdAt: ts(),
  updatedAt: ts(),
  ...over,
})
const expense = (over = {}) => ({
  type: 'expense',
  amount: 250.75,
  currency: 'NPR',
  accountId: 'acc1',
  toAccountId: null,
  categoryId: 'cat1',
  date: '2026-10-10',
  note: null,
  recurringRuleId: null,
  accountIds: ['acc1'],
  createdAt: ts(),
  updatedAt: ts(),
  ...over,
})
const budget = (over = {}) => ({
  name: 'Food',
  amount: 5000,
  period: 'monthly',
  categoryIds: ['cat1'],
  rollover: false,
  alertThresholds: [80, 100],
  lastAlert: null,
  active: true,
  createdAt: ts(),
  updatedAt: ts(),
  ...over,
})
const rule = (over = {}) => ({
  template: {
    type: 'expense',
    amount: 999,
    accountId: 'acc1',
    toAccountId: null,
    categoryId: 'cat1',
    note: 'Rent',
  },
  frequency: 'monthly',
  interval: 1,
  weekdays: [],
  dayOfMonth: 1,
  startDate: '2026-10-01',
  endType: 'never',
  endDate: null,
  maxCount: null,
  mode: 'auto',
  nextDueDate: '2026-11-01',
  occurrences: 0,
  active: true,
  createdAt: ts(),
  updatedAt: ts(),
  ...over,
})

async function main() {
  try {
    // The rules as they are in the file now, for this project alone.
    const rules = readFileSync(join(__dirname, '..', 'firestore.rules'), 'utf8')
    const loaded = await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}:securityRules`, {
      method: 'PUT',
      body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: rules }] } }),
    })
    if (!loaded.ok) {
      console.error('firestore.rules was refused:\n' + (await loaded.text()))
      process.exit(1)
    }
    await fetch(`http://${FIRESTORE}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, {
      method: 'DELETE',
    })
    await fetch(`http://${AUTH}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' })
  } catch {
    console.error("The emulators aren't running. Start them with npm run emulators, then try again.")
    process.exit(1)
  }

  const anon = client('anon')
  const a = client('a')
  const b = client('b')
  const ua = (await authSdk.createUserWithEmailAndPassword(a.auth, ALICE, 'password1')).user
  const ub = (await authSdk.createUserWithEmailAndPassword(b.auth, BOB, 'password1')).user
  created.push(ua, ub)
  const A = (...p) => fs.doc(a.db, 'users', ua.uid, ...p)
  const B = (...p) => fs.doc(b.db, 'users', ub.uid, ...p)

  // --- signup batch: profile + username + a category
  await expectOk('signup batch (profile, username, category)', () =>
    fs
      .writeBatch(a.db)
      .set(fs.doc(a.db, 'users', ua.uid), profile('Alice', 'alice', ALICE))
      .set(fs.doc(a.db, 'usernames', 'alice'), { uid: ua.uid, email: ALICE, pendingEmail: null })
      .set(A('categories', 'cat1'), category())
      .commit(),
  )

  // --- public username lookup
  await expectOk('logged out: get usernames/alice', async () => {
    const snap = await fs.getDoc(fs.doc(anon.db, 'usernames', 'alice'))
    if (snap.data()?.email !== ALICE) throw new Error('wrong email ' + JSON.stringify(snap.data()))
  })
  await expectOk('logged out: get a missing username', () => fs.getDoc(fs.doc(anon.db, 'usernames', 'nobody')))
  await expectDenied('logged out: list usernames', () => fs.getDocs(fs.collection(anon.db, 'usernames')))
  await expectDenied('logged out: read a profile', () => fs.getDoc(fs.doc(anon.db, 'users', ua.uid)))

  // --- username claims
  await expectDenied('B overwrites usernames/alice', () =>
    fs.setDoc(fs.doc(b.db, 'usernames', 'alice'), { uid: ub.uid, email: BOB, pendingEmail: null }),
  )
  await expectDenied('B claims a username without a profile holding it', () =>
    fs.setDoc(fs.doc(b.db, 'usernames', 'bobby'), { uid: ub.uid, email: BOB, pendingEmail: null }),
  )
  await expectDenied('B claims a username pointing at another email', () =>
    fs
      .writeBatch(b.db)
      .set(fs.doc(b.db, 'users', ub.uid), profile('Bob', 'bob', BOB))
      .set(fs.doc(b.db, 'usernames', 'bob'), { uid: ub.uid, email: ALICE, pendingEmail: null })
      .commit(),
  )
  await expectOk('B signs up as bob', () =>
    fs
      .writeBatch(b.db)
      .set(fs.doc(b.db, 'users', ub.uid), profile('Bob', 'bob', BOB))
      .set(fs.doc(b.db, 'usernames', 'bob'), { uid: ub.uid, email: BOB, pendingEmail: null })
      .commit(),
  )
  await expectDenied('B claims a second username', () =>
    fs.setDoc(fs.doc(b.db, 'usernames', 'bob2'), { uid: ub.uid, email: BOB, pendingEmail: null }),
  )
  await expectDenied('B deletes their profile but keeps the username', () =>
    fs.deleteDoc(fs.doc(b.db, 'users', ub.uid)),
  )
  await expectDenied('B changes their profile username', () =>
    fs.updateDoc(fs.doc(b.db, 'users', ub.uid), { username: 'robert', updatedAt: ts() }),
  )
  await expectOk('B marks a pending email on their username', () =>
    fs.updateDoc(fs.doc(b.db, 'usernames', 'bob'), { pendingEmail: 'new-bob@example.com' }),
  )
  await expectDenied('B points their username at another email', () =>
    fs.updateDoc(fs.doc(b.db, 'usernames', 'bob'), { email: ALICE }),
  )
  await expectDenied('A deletes B\'s username', () => fs.deleteDoc(fs.doc(a.db, 'usernames', 'bob')))
  await expectDenied('a username with capitals', () =>
    fs.setDoc(fs.doc(b.db, 'usernames', 'Bob'), { uid: ub.uid, email: BOB, pendingEmail: null }),
  )

  // --- profile fields
  await expectOk('A updates theme with a dotted path', () =>
    fs.updateDoc(fs.doc(a.db, 'users', ua.uid), { 'preferences.theme': 'dark', updatedAt: ts() }),
  )
  await expectOk('A updates a notification pref with a dotted path', () =>
    fs.updateDoc(fs.doc(a.db, 'users', ua.uid), {
      'preferences.notifications.reminderTime': '07:30',
      updatedAt: ts(),
    }),
  )
  await expectDenied('A sets a bad reminder time', () =>
    fs.updateDoc(fs.doc(a.db, 'users', ua.uid), { 'preferences.notifications.reminderTime': '25:00' }),
  )
  await expectDenied('A adds an unknown profile field', () =>
    fs.updateDoc(fs.doc(a.db, 'users', ua.uid), { admin: true }),
  )
  await expectOk('A saves a photo data URL', () =>
    fs.updateDoc(fs.doc(a.db, 'users', ua.uid), { photoUrl: 'data:image/jpeg;base64,QUJD', updatedAt: ts() }),
  )
  await expectDenied('A saves a photo that is a remote URL', () =>
    fs.updateDoc(fs.doc(a.db, 'users', ua.uid), { photoUrl: 'https://evil.example/x.png' }),
  )
  await expectDenied('B reads A\'s profile', () => fs.getDoc(fs.doc(b.db, 'users', ua.uid)))

  // --- accounts
  await expectOk('A creates an account', () => fs.setDoc(A('accounts', 'acc1'), account()))
  await expectOk('A creates a second account', () =>
    fs.setDoc(A('accounts', 'acc2'), account({ name: 'Bank', type: 'bank', sortOrder: 1 })),
  )
  await expectOk('A increments a balance', () =>
    fs.updateDoc(A('accounts', 'acc1'), { currentBalance: fs.increment(-10.25), updatedAt: ts() }),
  )
  await expectDenied('account name over 40 characters', () =>
    fs.setDoc(A('accounts', 'acc3'), account({ name: 'x'.repeat(41) })),
  )
  await expectDenied('account with an unknown type', () => fs.setDoc(A('accounts', 'acc3'), account({ type: 'crypto' })))
  await expectDenied('account with an extra field', () => fs.setDoc(A('accounts', 'acc3'), account({ owner: 'x' })))
  await expectDenied('account with a string balance', () =>
    fs.setDoc(A('accounts', 'acc3'), account({ currentBalance: '100' })),
  )
  await expectDenied('B reads A\'s accounts', () =>
    fs.getDocs(fs.collection(b.db, 'users', ua.uid, 'accounts')),
  )
  await expectDenied('B writes into A\'s accounts', () =>
    fs.setDoc(fs.doc(b.db, 'users', ua.uid, 'accounts', 'x'), account()),
  )

  // --- categories
  await expectDenied('category type change', () =>
    fs.updateDoc(A('categories', 'cat1'), { type: 'income', updatedAt: ts() }),
  )
  await expectOk('category rename', () => fs.updateDoc(A('categories', 'cat1'), { name: 'Food and dining', updatedAt: ts() }))
  await expectDenied('category name over 30 characters', () =>
    fs.setDoc(A('categories', 'cat2'), category({ name: 'y'.repeat(31) })),
  )

  // --- transactions
  await expectOk('A writes an expense with its balance move in one batch', () =>
    fs
      .writeBatch(a.db)
      .set(A('transactions', 't1'), expense())
      .update(A('accounts', 'acc1'), { currentBalance: fs.increment(-250.75), updatedAt: ts() })
      .commit(),
  )
  await expectOk('A writes a transfer', () =>
    fs.setDoc(
      A('transactions', 't2'),
      expense({ type: 'transfer', toAccountId: 'acc2', categoryId: null, accountIds: ['acc1', 'acc2'] }),
    ),
  )
  await expectDenied('transfer to the same account', () =>
    fs.setDoc(
      A('transactions', 't3'),
      expense({ type: 'transfer', toAccountId: 'acc1', categoryId: null, accountIds: ['acc1', 'acc1'] }),
    ),
  )
  await expectDenied('expense without a category', () =>
    fs.setDoc(A('transactions', 't3'), expense({ categoryId: null })),
  )
  await expectDenied('accountIds not matching the accounts', () =>
    fs.setDoc(A('transactions', 't3'), expense({ accountIds: ['acc2'] })),
  )
  await expectDenied('zero amount', () => fs.setDoc(A('transactions', 't3'), expense({ amount: 0 })))
  await expectDenied('bad date', () => fs.setDoc(A('transactions', 't3'), expense({ date: '10/10/2026' })))
  await expectDenied('note over 500 characters', () =>
    fs.setDoc(A('transactions', 't3'), expense({ note: 'n'.repeat(501) })),
  )
  await expectOk('entry from a recurring rule', () =>
    fs.setDoc(A('transactions', 't4'), expense({ recurringRuleId: 'rule1' })),
  )
  await expectOk('query by account (array-contains)', () =>
    fs.getDocs(fs.query(fs.collection(a.db, 'users', ua.uid, 'transactions'), fs.where('accountIds', 'array-contains', 'acc2'))),
  )
  await expectOk('query by date range', () =>
    fs.getDocs(
      fs.query(
        fs.collection(a.db, 'users', ua.uid, 'transactions'),
        fs.where('date', '>=', '2026-10-01'),
        fs.where('date', '<=', '2026-10-31'),
      ),
    ),
  )
  await expectDenied('B lists A\'s transactions', () =>
    fs.getDocs(fs.collection(b.db, 'users', ua.uid, 'transactions')),
  )

  // --- budgets
  await expectOk('A creates a budget', () => fs.setDoc(A('budgets', 'b1'), budget()))
  await expectOk('A records an alert', () =>
    fs.updateDoc(A('budgets', 'b1'), { lastAlert: { periodStart: '2026-10-01', threshold: 80 }, updatedAt: ts() }),
  )
  await expectDenied('budget with a negative amount', () => fs.setDoc(A('budgets', 'b2'), budget({ amount: -5 })))
  await expectDenied('budget with an unknown period', () => fs.setDoc(A('budgets', 'b2'), budget({ period: 'daily' })))

  // --- recurring rules
  await expectOk('A creates a rule', () => fs.setDoc(A('recurringRules', 'rule1'), rule()))
  await expectOk('A advances a rule with increment()', () =>
    fs.updateDoc(A('recurringRules', 'rule1'), {
      occurrences: fs.increment(2),
      nextDueDate: '2026-12-01',
      updatedAt: ts(),
    }),
  )
  await expectOk('A creates a weekly transfer rule', () =>
    fs.setDoc(
      A('recurringRules', 'rule2'),
      rule({
        template: { type: 'transfer', amount: 10, accountId: 'acc1', toAccountId: 'acc2', categoryId: null, note: null },
        frequency: 'weekly',
        weekdays: [1, 5],
        dayOfMonth: null,
        mode: 'confirm',
      }),
    ),
  )
  await expectDenied('rule with interval 0', () => fs.setDoc(A('recurringRules', 'rule3'), rule({ interval: 0 })))
  await expectDenied('rule template with an extra field', () =>
    fs.setDoc(A('recurringRules', 'rule3'), rule({ template: { ...rule().template, payee: 'x' } })),
  )

  // --- other paths
  await expectDenied('a collection outside the model', () => fs.setDoc(A('secrets', 'x'), { a: 1 }))
  await expectDenied('a top-level collection', () => fs.setDoc(fs.doc(a.db, 'admin', 'x'), { a: 1 }))

  // --- deleting the account
  await expectOk('A deletes their username and profile', () =>
    fs.writeBatch(a.db).delete(fs.doc(a.db, 'usernames', 'alice')).delete(fs.doc(a.db, 'users', ua.uid)).commit(),
  )

  await deleteLogins()
  console.log(results.join('\n'))
  console.log(`\n${passed} passed, ${failed} failed`)
  await Promise.all([anon, a, b].map((c) => deleteApp(c.app)))
  process.exit(failed ? 1 : 0)
}

main().catch(async (e) => {
  console.error(e)
  await deleteLogins()
  process.exit(1)
})
