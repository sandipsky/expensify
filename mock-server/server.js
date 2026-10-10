import express from 'express'
import cors from 'cors'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const app = express()
const PORT = Number(process.env.MOCK_API_PORT ?? 3000)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

// ---------------------------------------------------------------------------
// File-backed "database": data lives in db.json next to this file, so it
// survives restarts. Delete db.json to reset everything to the seed below.
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'db.json')

// The categories a new user starts with, and what "Add default categories"
// adds back. Icons are lumen-ui icon names; colors are the app's category palette.
const CATEGORY_TYPES = ['expense', 'income']

const DEFAULT_CATEGORIES = [
  { type: 'expense', name: 'Food and dining', icon: 'category', color: '#EA580C' },
  { type: 'expense', name: 'Groceries', icon: 'cart', color: '#15803D' },
  { type: 'expense', name: 'Transport', icon: 'train', color: '#2456E6' },
  { type: 'expense', name: 'Housing and rent', icon: 'home', color: '#8D6E63' },
  { type: 'expense', name: 'Utilities', icon: 'bolt', color: '#B45309' },
  { type: 'expense', name: 'Phone and internet', icon: 'wifi', color: '#0284C7' },
  { type: 'expense', name: 'Shopping', icon: 'bag', color: '#DB2777' },
  { type: 'expense', name: 'Health', icon: 'hospital', color: '#DC2626' },
  { type: 'expense', name: 'Education', icon: 'education', color: '#4F46E5' },
  { type: 'expense', name: 'Entertainment', icon: 'controller', color: '#9333EA' },
  { type: 'expense', name: 'Subscriptions', icon: 'refresh', color: '#0D9488' },
  { type: 'expense', name: 'Travel', icon: 'flight', color: '#0284C7' },
  { type: 'expense', name: 'Personal care', icon: 'heart', color: '#DB2777' },
  { type: 'expense', name: 'Gifts and donations', icon: 'hand', color: '#DC2626' },
  { type: 'expense', name: 'Family and kids', icon: 'family', color: '#B45309' },
  { type: 'expense', name: 'Insurance', icon: 'shield', color: '#0D9488' },
  { type: 'expense', name: 'Fees and charges', icon: 'receipt', color: '#64748B' },
  { type: 'income', name: 'Salary', icon: 'money', color: '#15803D' },
  { type: 'income', name: 'Business and freelance', icon: 'work', color: '#2456E6' },
  { type: 'income', name: 'Bonus', icon: 'star', color: '#B45309' },
  { type: 'income', name: 'Interest and dividends', icon: 'savings', color: '#0D9488' },
  { type: 'income', name: 'Rental income', icon: 'building', color: '#8D6E63' },
  { type: 'income', name: 'Gifts received', icon: 'heart', color: '#DB2777' },
  { type: 'income', name: 'Refunds', icon: 'undo', color: '#0284C7' },
  { type: 'income', name: 'Other income', icon: 'add', color: '#4F46E5' },
]

// What a profile's preferences start as: the device's theme, and alerts for
// what the user set up themselves. The daily reminder is opt-in.
const THEMES = ['light', 'dark', 'system']
const NOTIFICATION_PREFS = ['dailyReminder', 'reminderTime', 'budgetAlerts', 'billReminders']

const DEFAULT_PREFERENCES = {
  theme: 'system',
  notifications: {
    dailyReminder: false,
    reminderTime: '20:00',
    budgetAlerts: true,
    billReminders: true,
  },
}

const SEED = {
  users: [
    {
      id: 1,
      name: 'Admin',
      username: 'admin',
      email: 'admin@example.com',
      password: 'admin',
      photoUrl: null,
      preferences: DEFAULT_PREFERENCES,
    },
  ],
  products: [
    { id: 1, name: 'Keyboard', price: 2500, description: 'Mechanical keyboard' },
    { id: 2, name: 'Mouse', price: 1200, description: 'Wireless mouse' },
    { id: 3, name: 'Monitor', price: 15000, description: '27 inch 4K display' },
  ],
  // Amounts are plain numbers in the account's currency. A card's balance is
  // negative while money is owed on it.
  accounts: [
    account(1, 'Cash', 'cash', 5000, { icon: 'money', color: '#36B37E' }),
    account(2, 'Everyday bank', 'bank', 120000, { icon: 'bank', color: '#2456E6' }),
    account(3, 'Credit card', 'credit_card', -15000, {
      icon: 'card',
      color: '#AB20A9',
      creditLimit: 100000,
    }),
  ],
  // Expense and income categories; each type's list is numbered on its own.
  categories: seedCategories(),
  // Entries start empty; every one written moves its account balances.
  transactions: [],
  // Spending limits per week, month or year; figures are worked out on the device.
  budgets: [],
  // Templates plus schedules; the device works out the dates and posts the entries.
  recurringRules: [],
}

function account(id, name, type, openingBalance, { icon, color, creditLimit = null }) {
  const createdAt = '2026-01-01T00:00:00.000Z'
  return {
    id,
    name,
    type,
    currency: 'NPR',
    openingBalance,
    currentBalance: openingBalance,
    creditLimit,
    icon,
    color,
    includeInTotal: true,
    archived: false,
    sortOrder: id - 1,
    createdAt,
    updatedAt: createdAt,
  }
}

function seedCategory(id, { type, name, icon, color }, sortOrder) {
  const createdAt = '2026-01-01T00:00:00.000Z'
  return {
    id,
    name,
    type,
    icon,
    color,
    archived: false,
    sortOrder,
    createdAt,
    updatedAt: createdAt,
  }
}

// Every default category, each at its position in its type's list.
function seedCategories() {
  const counts = {}
  return DEFAULT_CATEGORIES.map((entry, index) => {
    const sortOrder = counts[entry.type] ?? 0
    counts[entry.type] = sortOrder + 1
    return seedCategory(index + 1, entry, sortOrder)
  })
}

const writeDb = (db) => writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n')
const readDb = () => {
  if (!existsSync(DB_PATH)) writeDb(SEED)
  const db = JSON.parse(readFileSync(DB_PATH, 'utf-8'))
  // A db.json written before a collection existed gets that collection's seed.
  // A copy, so later writes to the collection never change the seed itself.
  for (const key of Object.keys(SEED)) {
    if (!db[key]) {
      db[key] = structuredClone(SEED[key])
      writeDb(db)
    }
  }
  return db
}

// Next id = highest existing id + 1 (starts at 1 when the list is empty)
const nextId = (items) => items.reduce((max, item) => Math.max(max, item.id), 0) + 1

// What the client sees of a user: never the password. A user written before
// a field existed reads as its default.
const toProfile = ({ password: _password, ...user }) => ({
  ...user,
  email: user.email ?? '',
  photoUrl: user.photoUrl ?? null,
  preferences: {
    ...DEFAULT_PREFERENCES,
    ...user.preferences,
    notifications: { ...DEFAULT_PREFERENCES.notifications, ...user.preferences?.notifications },
  },
})

// A real server would sign a JWT. For a mock, the token just names the user,
// "mock-token-admin". Usernames never change, so a token works until its
// user is deleted.
const TOKEN_PREFIX = 'mock-token-'
const tokenFor = (user) => `${TOKEN_PREFIX}${user.username}`

// ---------------------------------------------------------------------------
// Auth middleware: protected routes need "Authorization: Bearer <token>".
// A missing/invalid token gets 403, which the frontend's axios interceptor
// turns into a logout + redirect to /login. Keep the two in sync.
// ---------------------------------------------------------------------------
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
  const user = token && readDb().users.find((u) => tokenFor(u) === token)
  if (!user) {
    return res.status(403).json({ message: 'Forbidden: missing or invalid token' })
  }
  req.userId = user.id
  next()
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body ?? {}
  if (!username || !password) {
    return res.status(400).json({ message: 'username and password are required' })
  }

  const db = readDb()
  const user = db.users.find((u) => u.username === username && u.password === password)
  if (!user) {
    return res.status(401).json({ message: 'Invalid username or password' })
  }

  res.json({ token: tokenFor(user), user: toProfile(user) })
})

// ---------------------------------------------------------------------------
// Profile (protected): the signed-in user, their preferences and password.
// A wrong password answers 401, which the frontend doesn't treat as signed out.
// ---------------------------------------------------------------------------
const MAX_USER_NAME = 60
const MIN_PASSWORD_LENGTH = 8
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// The device scales a photo down before sending it, as a data URL.
const PHOTO = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/
const MAX_PHOTO_LENGTH = 200_000
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/

const findMe = (db, req) => db.users.find((u) => u.id === req.userId)

const saveUser = (db, updated) => {
  db.users = db.users.map((u) => (u.id === updated.id ? updated : u))
  writeDb(db)
  return updated
}

const wrongPassword = (res) => res.status(401).json({ message: "That password isn't right" })

const validateProfile = ({ name, email, photoUrl }) => {
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return 'name is required'
    if (name.trim().length > MAX_USER_NAME) {
      return `name must be at most ${MAX_USER_NAME} characters`
    }
  }
  if (email !== undefined && (typeof email !== 'string' || !EMAIL.test(email.trim()))) {
    return 'email must be an email address'
  }
  if (photoUrl != null) {
    if (typeof photoUrl !== 'string' || !PHOTO.test(photoUrl)) {
      return 'photoUrl must be a JPEG, PNG or WebP data URL, or null'
    }
    if (photoUrl.length > MAX_PHOTO_LENGTH) return 'photoUrl is too large'
  }
  return null
}

// Only the fields sent change. The username never does: tokens are made from it.
const profileFields = ({ name, email, photoUrl }) => ({
  ...(name !== undefined && { name: name.trim() }),
  ...(email !== undefined && { email: email.trim() }),
  ...(photoUrl !== undefined && { photoUrl }),
})

const validatePreferences = ({ theme, notifications }) => {
  if (theme !== undefined && !THEMES.includes(theme)) {
    return `theme must be one of ${THEMES.join(', ')}`
  }
  if (notifications === undefined) return null
  if (!notifications || typeof notifications !== 'object') return 'notifications must be an object'
  for (const key of ['dailyReminder', 'budgetAlerts', 'billReminders']) {
    const value = notifications[key]
    if (value !== undefined && typeof value !== 'boolean') {
      return `notifications.${key} must be a boolean`
    }
  }
  const { reminderTime } = notifications
  if (reminderTime !== undefined && !TIME_OF_DAY.test(String(reminderTime))) {
    return 'notifications.reminderTime must be a 24-hour time written as HH:mm'
  }
  return null
}

app.get('/me', requireAuth, (req, res) => {
  res.json(toProfile(findMe(readDb(), req)))
})

app.patch('/me', requireAuth, (req, res) => {
  const body = req.body ?? {}
  const error = validateProfile(body)
  if (error) return res.status(400).json({ message: error })

  const db = readDb()
  res.json(toProfile(saveUser(db, { ...findMe(db, req), ...profileFields(body) })))
})

// Merges what was sent, so changing one preference leaves the others alone.
app.patch('/me/preferences', requireAuth, (req, res) => {
  const body = req.body ?? {}
  const error = validatePreferences(body)
  if (error) return res.status(400).json({ message: error })

  const db = readDb()
  const me = findMe(db, req)
  const current = toProfile(me).preferences
  const notifications = { ...current.notifications }
  for (const key of NOTIFICATION_PREFS) {
    if (body.notifications?.[key] !== undefined) notifications[key] = body.notifications[key]
  }
  const preferences = { theme: body.theme ?? current.theme, notifications }
  res.json(toProfile(saveUser(db, { ...me, preferences })))
})

// Takes the current password too, as a real server would before changing it.
app.post('/me/password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body ?? {}
  if (typeof currentPassword !== 'string' || !currentPassword) {
    return res.status(400).json({ message: 'currentPassword is required' })
  }
  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    return res
      .status(400)
      .json({ message: `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters` })
  }

  const db = readDb()
  const me = findMe(db, req)
  if (me.password !== currentPassword) return wrongPassword(res)
  saveUser(db, { ...me, password: newPassword })
  res.status(204).end()
})

// Deletes the user and everything they entered, once their password proves
// it's them. Every login shares the mock's one set of data, so all of it goes.
// With no user left the mock starts over from the seed, so admin / admin signs
// in again to a fresh account.
app.delete('/me', requireAuth, (req, res) => {
  const { password } = req.body ?? {}
  const db = readDb()
  const me = findMe(db, req)
  if (typeof password !== 'string' || me.password !== password) return wrongPassword(res)

  const users = db.users.filter((u) => u.id !== me.id)
  if (!users.length) {
    writeDb(SEED)
  } else {
    writeDb({
      ...db,
      users,
      accounts: [],
      categories: [],
      transactions: [],
      budgets: [],
      recurringRules: [],
    })
  }
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Products (protected)
// ---------------------------------------------------------------------------
const validateProduct = ({ name, price, description }) => {
  if (typeof name !== 'string' || !name.trim()) return 'name is required'
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    return 'price must be a positive number'
  }
  if (description !== undefined && typeof description !== 'string') {
    return 'description must be a string'
  }
  return null
}

app.get('/products', requireAuth, (req, res) => {
  res.json(readDb().products)
})

app.get('/products/:id', requireAuth, (req, res) => {
  const product = readDb().products.find((p) => p.id === Number(req.params.id))
  if (!product) return res.status(404).json({ message: 'Product not found' })
  res.json(product)
})

app.post('/products', requireAuth, (req, res) => {
  const body = req.body ?? {}
  const error = validateProduct(body)
  if (error) return res.status(400).json({ message: error })

  const db = readDb()
  const product = {
    id: nextId(db.products),
    name: body.name.trim(),
    price: body.price,
    description: body.description ?? '',
  }
  db.products.push(product)
  writeDb(db)
  res.status(201).json(product)
})

app.put('/products/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const db = readDb()
  const existing = db.products.find((p) => p.id === id)
  if (!existing) return res.status(404).json({ message: 'Product not found' })

  const body = req.body ?? {}
  const error = validateProduct(body)
  if (error) return res.status(400).json({ message: error })

  // Immutable update: build a new array instead of mutating in place
  const updated = {
    ...existing,
    name: body.name.trim(),
    price: body.price,
    description: body.description ?? '',
  }
  db.products = db.products.map((p) => (p.id === id ? updated : p))
  writeDb(db)
  res.json(updated)
})

app.delete('/products/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const db = readDb()
  if (!db.products.some((p) => p.id === id)) {
    return res.status(404).json({ message: 'Product not found' })
  }
  db.products = db.products.filter((p) => p.id !== id)
  writeDb(db)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Accounts (protected)
// ---------------------------------------------------------------------------
const ACCOUNT_TYPES = ['cash', 'bank', 'credit_card', 'wallet', 'savings', 'loan', 'other']

const validateAccount = (body) => {
  const { name, type, currency, openingBalance, creditLimit, icon, color, includeInTotal } = body
  if (typeof name !== 'string' || !name.trim()) return 'name is required'
  if (name.trim().length > 40) return 'name must be at most 40 characters'
  if (!ACCOUNT_TYPES.includes(type)) return `type must be one of ${ACCOUNT_TYPES.join(', ')}`
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) {
    return 'currency must be a 3-letter ISO 4217 code'
  }
  if (typeof openingBalance !== 'number' || !Number.isFinite(openingBalance)) {
    return 'openingBalance must be a number'
  }
  if (creditLimit != null && (typeof creditLimit !== 'number' || creditLimit <= 0)) {
    return 'creditLimit must be a positive number or null'
  }
  if (typeof icon !== 'string' || !icon) return 'icon is required'
  if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return 'color must be a hex color'
  }
  if (typeof includeInTotal !== 'boolean') return 'includeInTotal must be a boolean'
  return null
}

// The fields a client may set; everything else belongs to the server.
const accountFields = (body) => ({
  name: body.name.trim(),
  type: body.type,
  currency: body.currency,
  openingBalance: body.openingBalance,
  creditLimit: body.type === 'credit_card' && body.creditLimit ? body.creditLimit : null,
  icon: body.icon,
  color: body.color,
  includeInTotal: body.includeInTotal,
})

const findAccount = (db, id) => db.accounts.find((a) => a.id === Number(id))

const saveAccount = (db, updated) => {
  db.accounts = db.accounts.map((a) => (a.id === updated.id ? updated : a))
  writeDb(db)
  return updated
}

app.get('/accounts', requireAuth, (req, res) => {
  res.json([...readDb().accounts].sort((a, b) => a.sortOrder - b.sortOrder))
})

app.get('/accounts/:id', requireAuth, (req, res) => {
  const account = findAccount(readDb(), req.params.id)
  if (!account) return res.status(404).json({ message: 'Account not found' })
  res.json(account)
})

app.post('/accounts', requireAuth, (req, res) => {
  const body = req.body ?? {}
  const error = validateAccount(body)
  if (error) return res.status(400).json({ message: error })

  const db = readDb()
  const now = new Date().toISOString()
  const account = {
    id: nextId(db.accounts),
    ...accountFields(body),
    // The current balance starts at the opening balance and then only moves with transactions.
    currentBalance: body.openingBalance,
    archived: false,
    sortOrder: Math.max(-1, ...db.accounts.map((a) => a.sortOrder)) + 1,
    createdAt: now,
    updatedAt: now,
  }
  db.accounts.push(account)
  writeDb(db)
  res.status(201).json(account)
})

app.put('/accounts/:id', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findAccount(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Account not found' })

  const body = req.body ?? {}
  const error = validateAccount(body)
  if (error) return res.status(400).json({ message: error })

  // A new opening balance shifts the current balance by the same difference.
  const delta = body.openingBalance - existing.openingBalance
  const updated = {
    ...existing,
    ...accountFields(body),
    currentBalance: existing.currentBalance + delta,
    updatedAt: new Date().toISOString(),
  }
  res.json(saveAccount(db, updated))
})

// Archived accounts leave pickers and the total but keep their history.
app.patch('/accounts/:id/archived', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findAccount(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Account not found' })

  const { archived } = req.body ?? {}
  if (typeof archived !== 'boolean') {
    return res.status(400).json({ message: 'archived must be a boolean' })
  }

  res.json(saveAccount(db, { ...existing, archived, updatedAt: new Date().toISOString() }))
})

// Reconcile: move the current balance to what the bank really shows. Once
// transactions exist, the difference becomes a "Balance adjustment" entry.
app.post('/accounts/:id/reconcile', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findAccount(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Account not found' })

  const { actualBalance } = req.body ?? {}
  if (typeof actualBalance !== 'number' || !Number.isFinite(actualBalance)) {
    return res.status(400).json({ message: 'actualBalance must be a number' })
  }

  res.json(
    saveAccount(db, {
      ...existing,
      currentBalance: actualBalance,
      updatedAt: new Date().toISOString(),
    }),
  )
})

app.delete('/accounts/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const db = readDb()
  if (!db.accounts.some((a) => a.id === id)) {
    return res.status(404).json({ message: 'Account not found' })
  }
  db.accounts = db.accounts.filter((a) => a.id !== id)
  writeDb(db)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Categories (protected)
// ---------------------------------------------------------------------------
const nameKey = (name) => name.trim().toLowerCase()

// Names are unique per type, ignoring case; archived categories count too.
const isCategoryNameTaken = (categories, { name, type }, exceptId = null) =>
  categories.some((c) => c.id !== exceptId && c.type === type && nameKey(c.name) === nameKey(name))

const validateCategory = (body, categories, exceptId = null) => {
  const { name, type, icon, color } = body
  if (typeof name !== 'string' || !name.trim()) return 'name is required'
  if (name.trim().length > 30) return 'name must be at most 30 characters'
  if (!CATEGORY_TYPES.includes(type)) return `type must be one of ${CATEGORY_TYPES.join(', ')}`
  if (typeof icon !== 'string' || !icon) return 'icon is required'
  if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return 'color must be a hex color'
  }
  if (isCategoryNameTaken(categories, body, exceptId)) {
    return `You already have an ${type} category with this name`
  }
  return null
}

// The fields a client may set; everything else belongs to the server.
const categoryFields = (body) => ({
  name: body.name.trim(),
  type: body.type,
  icon: body.icon,
  color: body.color,
})

const findCategory = (db, id) => db.categories.find((c) => c.id === Number(id))

const saveCategory = (db, updated) => {
  db.categories = db.categories.map((c) => (c.id === updated.id ? updated : c))
  writeDb(db)
  return updated
}

// A new category goes to the end of its type's list.
const nextCategorySortOrder = (categories, type) =>
  Math.max(-1, ...categories.filter((c) => c.type === type).map((c) => c.sortOrder)) + 1

app.get('/categories', requireAuth, (req, res) => {
  res.json([...readDb().categories].sort((a, b) => a.sortOrder - b.sortOrder))
})

app.get('/categories/:id', requireAuth, (req, res) => {
  const category = findCategory(readDb(), req.params.id)
  if (!category) return res.status(404).json({ message: 'Category not found' })
  res.json(category)
})

app.post('/categories', requireAuth, (req, res) => {
  const body = req.body ?? {}
  const db = readDb()
  const error = validateCategory(body, db.categories)
  if (error) return res.status(400).json({ message: error })

  const now = new Date().toISOString()
  const category = {
    id: nextId(db.categories),
    ...categoryFields(body),
    archived: false,
    sortOrder: nextCategorySortOrder(db.categories, body.type),
    createdAt: now,
    updatedAt: now,
  }
  db.categories.push(category)
  writeDb(db)
  res.status(201).json(category)
})

// Adds the defaults the user doesn't have, matched by type and name. Answers with the ones added.
app.post('/categories/defaults', requireAuth, (req, res) => {
  const db = readDb()
  const now = new Date().toISOString()
  const added = []
  for (const entry of DEFAULT_CATEGORIES) {
    if (isCategoryNameTaken(db.categories, entry)) continue
    const category = {
      id: nextId(db.categories),
      ...entry,
      archived: false,
      sortOrder: nextCategorySortOrder(db.categories, entry.type),
      createdAt: now,
      updatedAt: now,
    }
    db.categories.push(category)
    added.push(category)
  }
  if (added.length) writeDb(db)
  res.status(added.length ? 201 : 200).json(added)
})

app.put('/categories/:id', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findCategory(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Category not found' })

  const body = req.body ?? {}
  const error = validateCategory(body, db.categories, existing.id)
  if (error) return res.status(400).json({ message: error })
  // Entries of its type use it, so it can't move to the other list.
  if (body.type !== existing.type) {
    return res.status(400).json({ message: "type can't be changed" })
  }

  res.json(
    saveCategory(db, {
      ...existing,
      ...categoryFields(body),
      updatedAt: new Date().toISOString(),
    }),
  )
})

// Archived categories leave pickers; entries that use them keep them.
app.patch('/categories/:id/archived', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findCategory(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Category not found' })

  const { archived } = req.body ?? {}
  if (typeof archived !== 'boolean') {
    return res.status(400).json({ message: 'archived must be a boolean' })
  }

  res.json(saveCategory(db, { ...existing, archived, updatedAt: new Date().toISOString() }))
})

app.delete('/categories/:id', requireAuth, (req, res) => {
  const id = Number(req.params.id)
  const db = readDb()
  if (!db.categories.some((c) => c.id === id)) {
    return res.status(404).json({ message: 'Category not found' })
  }
  db.categories = db.categories.filter((c) => c.id !== id)
  writeDb(db)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Transactions (protected)
// ---------------------------------------------------------------------------
const TX_TYPES = ['expense', 'income', 'transfer']
const MAX_NOTE_LENGTH = 500
const YMD = /^\d{4}-\d{2}-\d{2}$/

// A real calendar date written as YYYY-MM-DD: "2026-02-30" rolls over, so it fails.
const isYmd = (value) => {
  if (typeof value !== 'string' || !YMD.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

// What an entry is, without its date: shared by transactions and the
// templates of recurring rules.
const validateEntry = (body, db) => {
  const { type, amount, accountId, toAccountId, categoryId, note } = body
  if (!TX_TYPES.includes(type)) return `type must be one of ${TX_TYPES.join(', ')}`
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return 'amount must be a positive number'
  }
  if (!findAccount(db, accountId)) return 'accountId must be an existing account'
  if (type === 'transfer') {
    if (!findAccount(db, toAccountId)) return 'toAccountId must be an existing account'
    if (Number(toAccountId) === Number(accountId)) return 'a transfer needs two different accounts'
    if (categoryId != null) return 'a transfer has no category'
  } else {
    if (toAccountId != null) return 'only a transfer has a toAccountId'
    const category = findCategory(db, categoryId)
    if (!category) return 'categoryId must be an existing category'
    if (category.type !== type) return `categoryId must be an ${type} category`
  }
  if (note != null && typeof note !== 'string') return 'note must be a string'
  if (note && note.trim().length > MAX_NOTE_LENGTH) {
    return `note must be at most ${MAX_NOTE_LENGTH} characters`
  }
  return null
}

const validateTransaction = (body, db) => {
  const error = validateEntry(body, db)
  if (error) return error
  if (!isYmd(body.date)) return 'date must be a calendar date written as YYYY-MM-DD'
  return null
}

// The fields a client may set; everything else belongs to the server. The
// currency is the source account's, since every amount is in it.
const transactionFields = (body, db) => ({
  type: body.type,
  amount: body.amount,
  currency: findAccount(db, body.accountId).currency,
  accountId: Number(body.accountId),
  toAccountId: body.type === 'transfer' ? Number(body.toAccountId) : null,
  categoryId: body.type === 'transfer' ? null : Number(body.categoryId),
  date: body.date,
  note: body.note?.trim() || null,
})

// What an entry does to each account it touches: income adds to its account,
// an expense takes from it, and a transfer moves the amount across.
const effects = (tx) => {
  if (tx.type === 'income') return [{ accountId: tx.accountId, delta: tx.amount }]
  if (tx.type === 'expense') return [{ accountId: tx.accountId, delta: -tx.amount }]
  return [
    { accountId: tx.accountId, delta: -tx.amount },
    { accountId: tx.toAccountId, delta: tx.amount },
  ]
}

// Moves balances by the effects, scaled by `sign` (-1 reverses them). An
// account deleted since the entry was written has no balance to move.
const applyEffects = (db, tx, sign) => {
  for (const { accountId, delta } of effects(tx)) {
    const account = findAccount(db, accountId)
    if (!account) continue
    account.currentBalance += sign * delta
    account.updatedAt = new Date().toISOString()
  }
}

const findTransaction = (db, id) => db.transactions.find((t) => t.id === Number(id))

// Newest first: by date, then creation, then id.
const newestFirst = (a, b) =>
  (a.date < b.date ? 1 : a.date > b.date ? -1 : 0) ||
  (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0) ||
  b.id - a.id

// ?from=YYYY-MM-DD&to=YYYY-MM-DD narrows to a period; ?accountId= to entries
// touching an account, on either side of a transfer; ?recurringRuleId= to the
// entries a rule added. Without any, every entry.
app.get('/transactions', requireAuth, (req, res) => {
  const { from, to, accountId, recurringRuleId } = req.query
  if ((from && !isYmd(from)) || (to && !isYmd(to))) {
    return res.status(400).json({ message: 'from and to must be dates written as YYYY-MM-DD' })
  }
  const account = accountId === undefined ? null : Number(accountId)
  if (account !== null && !Number.isInteger(account)) {
    return res.status(400).json({ message: 'accountId must be a number' })
  }
  const rule = recurringRuleId === undefined ? null : Number(recurringRuleId)
  if (rule !== null && !Number.isInteger(rule)) {
    return res.status(400).json({ message: 'recurringRuleId must be a number' })
  }
  const list = readDb().transactions.filter(
    (t) =>
      (!from || t.date >= from) &&
      (!to || t.date <= to) &&
      (account === null || t.accountId === account || t.toAccountId === account) &&
      (rule === null || t.recurringRuleId === rule),
  )
  res.json(list.sort(newestFirst))
})

app.get('/transactions/:id', requireAuth, (req, res) => {
  const transaction = findTransaction(readDb(), req.params.id)
  if (!transaction) return res.status(404).json({ message: 'Transaction not found' })
  res.json(transaction)
})

app.post('/transactions', requireAuth, (req, res) => {
  const body = req.body ?? {}
  const db = readDb()
  const error = validateTransaction(body, db)
  if (error) return res.status(400).json({ message: error })

  const now = new Date().toISOString()
  const transaction = {
    id: nextId(db.transactions),
    ...transactionFields(body, db),
    recurringRuleId: null,
    createdAt: now,
    updatedAt: now,
  }
  db.transactions.push(transaction)
  applyEffects(db, transaction, 1)
  writeDb(db)
  res.status(201).json(transaction)
})

// An edit reverses what the old entry did to balances and applies the new one.
app.put('/transactions/:id', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findTransaction(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Transaction not found' })

  const body = req.body ?? {}
  const error = validateTransaction(body, db)
  if (error) return res.status(400).json({ message: error })

  const updated = {
    ...existing,
    ...transactionFields(body, db),
    updatedAt: new Date().toISOString(),
  }
  applyEffects(db, existing, -1)
  applyEffects(db, updated, 1)
  db.transactions = db.transactions.map((t) => (t.id === updated.id ? updated : t))
  writeDb(db)
  res.json(updated)
})

// Deletes every entry, undoing what each did to its accounts as a single
// delete does. Accounts, categories, budgets and recurring rules stay.
app.delete('/transactions', requireAuth, (req, res) => {
  const db = readDb()
  for (const transaction of db.transactions) applyEffects(db, transaction, -1)
  const deleted = db.transactions.length
  db.transactions = []
  writeDb(db)
  res.json({ deleted })
})

app.delete('/transactions/:id', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findTransaction(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Transaction not found' })
  applyEffects(db, existing, -1)
  db.transactions = db.transactions.filter((t) => t.id !== existing.id)
  writeDb(db)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Budgets (protected)
// ---------------------------------------------------------------------------
const BUDGET_PERIODS = ['weekly', 'monthly', 'yearly']
const MAX_BUDGET_NAME = 40

const validateBudget = (body, db) => {
  const { name, amount, period, categoryIds, rollover, alertThresholds } = body
  if (typeof name !== 'string' || !name.trim()) return 'name is required'
  if (name.trim().length > MAX_BUDGET_NAME) {
    return `name must be at most ${MAX_BUDGET_NAME} characters`
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    return 'amount must be a positive number'
  }
  if (!BUDGET_PERIODS.includes(period)) return `period must be one of ${BUDGET_PERIODS.join(', ')}`
  if (!Array.isArray(categoryIds)) return 'categoryIds must be a list'
  for (const id of categoryIds) {
    const category = findCategory(db, id)
    if (!category) return 'categoryIds must be existing categories'
    if (category.type !== 'expense') return 'categoryIds must be expense categories'
  }
  if (typeof rollover !== 'boolean') return 'rollover must be a boolean'
  if (
    !Array.isArray(alertThresholds) ||
    alertThresholds.some((t) => !Number.isInteger(t) || t < 1 || t > 1000)
  ) {
    return 'alertThresholds must be whole percentages'
  }
  return null
}

// The fields a client may set; the alert record, the paused flag and the
// timestamps belong to the server. An empty category list means every expense.
const budgetFields = (body) => ({
  name: body.name.trim(),
  amount: body.amount,
  period: body.period,
  categoryIds: [...new Set(body.categoryIds.map(Number))],
  rollover: body.rollover,
  alertThresholds: [...new Set(body.alertThresholds)].sort((a, b) => a - b),
})

const findBudget = (db, id) => db.budgets.find((b) => b.id === Number(id))

const saveBudget = (db, updated) => {
  db.budgets = db.budgets.map((b) => (b.id === updated.id ? updated : b))
  writeDb(db)
  return updated
}

app.get('/budgets', requireAuth, (req, res) => {
  res.json(readDb().budgets)
})

app.get('/budgets/:id', requireAuth, (req, res) => {
  const budget = findBudget(readDb(), req.params.id)
  if (!budget) return res.status(404).json({ message: 'Budget not found' })
  res.json(budget)
})

app.post('/budgets', requireAuth, (req, res) => {
  const body = req.body ?? {}
  const db = readDb()
  const error = validateBudget(body, db)
  if (error) return res.status(400).json({ message: error })

  const now = new Date().toISOString()
  const budget = {
    id: nextId(db.budgets),
    ...budgetFields(body),
    lastAlert: null,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  db.budgets.push(budget)
  writeDb(db)
  res.status(201).json(budget)
})

app.put('/budgets/:id', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findBudget(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Budget not found' })

  const body = req.body ?? {}
  const error = validateBudget(body, db)
  if (error) return res.status(400).json({ message: error })

  res.json(
    saveBudget(db, { ...existing, ...budgetFields(body), updatedAt: new Date().toISOString() }),
  )
})

// Paused budgets keep their settings but show no progress and send no alerts.
app.patch('/budgets/:id/active', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findBudget(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Budget not found' })

  const { active } = req.body ?? {}
  if (typeof active !== 'boolean') return res.status(400).json({ message: 'active must be a boolean' })

  res.json(saveBudget(db, { ...existing, active, updatedAt: new Date().toISOString() }))
})

// The highest threshold already alerted in the period starting on periodStart,
// so each threshold alerts once per period, whichever tab shows it.
app.patch('/budgets/:id/alert', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findBudget(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Budget not found' })

  const { periodStart, threshold } = req.body ?? {}
  if (!isYmd(periodStart)) {
    return res.status(400).json({ message: 'periodStart must be a date written as YYYY-MM-DD' })
  }
  if (!Number.isInteger(threshold) || threshold < 1) {
    return res.status(400).json({ message: 'threshold must be a whole percentage' })
  }

  // Never lower what a period already alerted, should two tabs race.
  const last = existing.lastAlert
  if (last && last.periodStart === periodStart && last.threshold >= threshold) {
    return res.json(existing)
  }
  res.json(saveBudget(db, { ...existing, lastAlert: { periodStart, threshold } }))
})

// Transactions aren't touched.
app.delete('/budgets/:id', requireAuth, (req, res) => {
  const db = readDb()
  if (!findBudget(db, req.params.id)) return res.status(404).json({ message: 'Budget not found' })
  db.budgets = db.budgets.filter((b) => b.id !== Number(req.params.id))
  writeDb(db)
  res.status(204).end()
})

// ---------------------------------------------------------------------------
// Recurring rules (protected)
// ---------------------------------------------------------------------------
const FREQUENCIES = ['daily', 'weekly', 'monthly', 'yearly']
const END_TYPES = ['never', 'count', 'until']
const RULE_MODES = ['auto', 'confirm']
const MAX_INTERVAL = 99
const MAX_OCCURRENCES = 999
// Most entries one request may add, when catching up on missed dates.
const CATCH_UP_LIMIT = 100

const isWhole = (value, min, max) => Number.isInteger(value) && value >= min && value <= max

const validateRule = (body, db) => {
  const { template, frequency, interval, weekdays, dayOfMonth, startDate } = body
  const { endType, endDate, maxCount, mode, nextDueDate } = body
  if (!template || typeof template !== 'object') return 'template is required'
  const entryError = validateEntry(template, db)
  if (entryError) return `template: ${entryError}`
  if (!FREQUENCIES.includes(frequency)) return `frequency must be one of ${FREQUENCIES.join(', ')}`
  if (!isWhole(interval, 1, MAX_INTERVAL)) {
    return `interval must be a whole number from 1 to ${MAX_INTERVAL}`
  }
  if (!Array.isArray(weekdays) || weekdays.some((d) => !isWhole(d, 1, 7))) {
    return 'weekdays must be ISO weekdays, 1 to 7'
  }
  if (frequency === 'weekly' && !weekdays.length) return 'a weekly rule needs at least one weekday'
  if (frequency === 'monthly' && !isWhole(dayOfMonth, 1, 31)) {
    return 'dayOfMonth must be a whole number from 1 to 31'
  }
  if (!isYmd(startDate)) return 'startDate must be a calendar date written as YYYY-MM-DD'
  if (!END_TYPES.includes(endType)) return `endType must be one of ${END_TYPES.join(', ')}`
  if (endType === 'count' && !isWhole(maxCount, 1, MAX_OCCURRENCES)) {
    return `maxCount must be a whole number from 1 to ${MAX_OCCURRENCES}`
  }
  if (endType === 'until') {
    if (!isYmd(endDate)) return 'endDate must be a calendar date written as YYYY-MM-DD'
    if (endDate < startDate) return 'endDate must be on or after startDate'
  }
  if (!RULE_MODES.includes(mode)) return `mode must be one of ${RULE_MODES.join(', ')}`
  if (!isYmd(nextDueDate)) return 'nextDueDate must be a calendar date written as YYYY-MM-DD'
  return null
}

// The fields a client may set, with the ones other frequencies and ends don't
// use cleared. The count of entries added, the paused flag and the timestamps
// belong to the server. The device works out `nextDueDate` from the schedule.
const ruleFields = (body) => {
  const { template } = body
  const transfer = template.type === 'transfer'
  return {
    template: {
      type: template.type,
      amount: template.amount,
      accountId: Number(template.accountId),
      toAccountId: transfer ? Number(template.toAccountId) : null,
      categoryId: transfer ? null : Number(template.categoryId),
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

const findRule = (db, id) => db.recurringRules.find((r) => r.id === Number(id))

const saveRule = (db, updated) => {
  db.recurringRules = db.recurringRules.map((r) => (r.id === updated.id ? updated : r))
  writeDb(db)
  return updated
}

// Occurrences are handled oldest first, so a request must start at the rule's
// next due date. Anything else was confirmed, skipped or added already, in
// another tab or by the runner: 409, and nothing is written twice.
const isStale = (rule, date) => !rule.active || rule.nextDueDate !== date

app.get('/recurring', requireAuth, (req, res) => {
  res.json(readDb().recurringRules)
})

app.get('/recurring/:id', requireAuth, (req, res) => {
  const rule = findRule(readDb(), req.params.id)
  if (!rule) return res.status(404).json({ message: 'Recurring rule not found' })
  res.json(rule)
})

app.post('/recurring', requireAuth, (req, res) => {
  const body = req.body ?? {}
  const db = readDb()
  const error = validateRule(body, db)
  if (error) return res.status(400).json({ message: error })

  const now = new Date().toISOString()
  const rule = {
    id: nextId(db.recurringRules),
    ...ruleFields(body),
    occurrences: 0,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  db.recurringRules.push(rule)
  writeDb(db)
  res.status(201).json(rule)
})

// Edits reach future entries only: the ones already added stay as they are.
app.put('/recurring/:id', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findRule(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Recurring rule not found' })

  const body = req.body ?? {}
  const error = validateRule(body, db)
  if (error) return res.status(400).json({ message: error })

  res.json(saveRule(db, { ...existing, ...ruleFields(body), updatedAt: new Date().toISOString() }))
})

// Pausing stops new entries. Resuming sends the next due date to pick up from,
// so dates that passed while paused are left out.
app.patch('/recurring/:id/active', requireAuth, (req, res) => {
  const db = readDb()
  const existing = findRule(db, req.params.id)
  if (!existing) return res.status(404).json({ message: 'Recurring rule not found' })

  const { active, nextDueDate } = req.body ?? {}
  if (typeof active !== 'boolean') return res.status(400).json({ message: 'active must be a boolean' })
  if (nextDueDate !== undefined && !isYmd(nextDueDate)) {
    return res.status(400).json({ message: 'nextDueDate must be a date written as YYYY-MM-DD' })
  }

  res.json(
    saveRule(db, {
      ...existing,
      active,
      nextDueDate: nextDueDate ?? existing.nextDueDate,
      updatedAt: new Date().toISOString(),
    }),
  )
})

// Adds the entries due on `dates` (oldest first, starting at the rule's next
// due date) and moves the rule on to `nextDueDate`, in one write. An `entry`
// replaces the template for a single date, as edited before confirming. Every
// entry moves its account balances, like any other.
app.post('/recurring/:id/occurrences', requireAuth, (req, res) => {
  const db = readDb()
  const rule = findRule(db, req.params.id)
  if (!rule) return res.status(404).json({ message: 'Recurring rule not found' })

  const { dates, nextDueDate, entry } = req.body ?? {}
  if (!Array.isArray(dates) || !dates.length || dates.length > CATCH_UP_LIMIT) {
    return res.status(400).json({ message: `dates must list 1 to ${CATCH_UP_LIMIT} dates` })
  }
  if (dates.some((d, i) => !isYmd(d) || (i > 0 && d <= dates[i - 1]))) {
    return res.status(400).json({ message: 'dates must be YYYY-MM-DD dates, oldest first' })
  }
  if (!isYmd(nextDueDate) || nextDueDate <= dates[dates.length - 1]) {
    return res.status(400).json({ message: 'nextDueDate must be a date after the last one added' })
  }
  if (entry !== undefined) {
    if (dates.length !== 1) {
      return res.status(400).json({ message: 'an edited entry stands for one date only' })
    }
    const error = validateTransaction(entry, db)
    if (error) return res.status(400).json({ message: error })
  }
  if (isStale(rule, dates[0])) {
    return res.status(409).json({ message: 'Already handled, perhaps in another tab' })
  }

  // The template's category may have been deleted since; the entries keep it,
  // as other entries of a deleted category do. Their accounts must exist.
  const source = entry ?? rule.template
  const transfer = source.type === 'transfer'
  const from = findAccount(db, source.accountId)
  if (!from || (transfer && !findAccount(db, source.toAccountId))) {
    return res.status(400).json({
      message: 'An account this rule uses was deleted. Edit the rule to pick another one.',
    })
  }

  const now = new Date().toISOString()
  const added = dates.map((date) => {
    const transaction = {
      id: nextId(db.transactions),
      type: source.type,
      amount: source.amount,
      currency: from.currency,
      accountId: Number(source.accountId),
      toAccountId: transfer ? Number(source.toAccountId) : null,
      categoryId: transfer ? null : Number(source.categoryId),
      // An edited entry may move its own date; the schedule date still counts as handled.
      date: entry ? entry.date : date,
      note: source.note?.trim() || null,
      recurringRuleId: rule.id,
      createdAt: now,
      updatedAt: now,
    }
    db.transactions.push(transaction)
    applyEffects(db, transaction, 1)
    return transaction
  })

  const updated = saveRule(db, {
    ...rule,
    occurrences: rule.occurrences + dates.length,
    nextDueDate,
    updatedAt: now,
  })
  res.status(201).json({ rule: updated, transactions: added })
})

// Passes over the entry due on `date` without adding anything.
app.post('/recurring/:id/skip', requireAuth, (req, res) => {
  const db = readDb()
  const rule = findRule(db, req.params.id)
  if (!rule) return res.status(404).json({ message: 'Recurring rule not found' })

  const { date, nextDueDate } = req.body ?? {}
  if (!isYmd(date) || !isYmd(nextDueDate) || nextDueDate <= date) {
    return res.status(400).json({ message: 'date and a later nextDueDate are required' })
  }
  if (isStale(rule, date)) {
    return res.status(409).json({ message: 'Already handled, perhaps in another tab' })
  }

  res.json(saveRule(db, { ...rule, nextDueDate, updatedAt: new Date().toISOString() }))
})

// The entries it already added stay, since they really happened.
app.delete('/recurring/:id', requireAuth, (req, res) => {
  const db = readDb()
  if (!findRule(db, req.params.id)) {
    return res.status(404).json({ message: 'Recurring rule not found' })
  }
  db.recurringRules = db.recurringRules.filter((r) => r.id !== Number(req.params.id))
  writeDb(db)
  res.status(204).end()
})

// Anything else -> JSON 404 (instead of Express' HTML error page)
app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.path}` })
})

app.listen(PORT, () => {
  console.log(`Mock API running at http://localhost:${PORT}`)
  console.log('Login with: admin / admin')
})
