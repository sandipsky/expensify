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
}

const writeDb = (db) => writeFileSync(DB_PATH, JSON.stringify(db, null, 2) + '\n')
const readDb = () => {
  if (!existsSync(DB_PATH)) writeDb(SEED)
  return JSON.parse(readFileSync(DB_PATH, 'utf-8'))
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

// Anything else -> JSON 404 (instead of Express' HTML error page)
app.use((req, res) => {
  res.status(404).json({ message: `No route for ${req.method} ${req.path}` })
})

app.listen(PORT, () => {
  console.log(`Mock API running at http://localhost:${PORT}`)
  console.log('Login with: admin / admin')
})
