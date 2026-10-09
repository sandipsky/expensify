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

const SEED = {
  users: [{ id: 1, name: 'Admin', username: 'admin', password: 'admin' }],
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

const writeDb = (db) => writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n')
const readDb = () => {
  if (!existsSync(DB_PATH)) writeDb(SEED)
  const db = JSON.parse(readFileSync(DB_PATH, 'utf-8'))
  // A db.json written before a collection existed gets that collection's seed.
  for (const key of Object.keys(SEED)) {
    if (!db[key]) {
      db[key] = SEED[key]
      writeDb(db)
    }
  }
  return db
}

// Next id = highest existing id + 1 (starts at 1 when the list is empty)
const nextId = (items) => items.reduce((max, item) => Math.max(max, item.id), 0) + 1

// Never send passwords back to the client
const toPublicUser = ({ password: _password, ...user }) => user

// A real server would sign a JWT. For a mock, one fixed token is enough.
const DUMMY_TOKEN = 'mock-token-admin'

// ---------------------------------------------------------------------------
// Auth middleware: protected routes need "Authorization: Bearer <token>".
// A missing/invalid token gets 403, which the frontend's axios interceptor
// turns into a logout + redirect to /login. Keep the two in sync.
// ---------------------------------------------------------------------------
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null
  if (token !== DUMMY_TOKEN) {
    return res.status(403).json({ message: 'Forbidden: missing or invalid token' })
  }
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

  res.json({ token: DUMMY_TOKEN, user: toPublicUser(user) })
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

// Anything else -> JSON 404 (instead of Express' HTML error page)
app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.path}` })
})

app.listen(PORT, () => {
  console.log(`Mock API running at http://localhost:${PORT}`)
  console.log('Login with: admin / admin')
})
