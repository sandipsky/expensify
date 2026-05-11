# Expensify — Project Documentation

A personal finance tracking app for managing **income**, **expenses**, **accounts**, and **budgets**, with a dashboard, calendar view, and import/export.

---

## 1. Overview

Expensify lets a user:

- Track income and expense transactions across multiple accounts.
- Categorize transactions with custom categories (each fixed as income or expense).
- Manage accounts (bank, wallet, cash, etc.) with an initial balance.
- Set budgets per expense category and account over a defined duration.
- Visualize spending and income on a dashboard and a calendar.
- Import and export data for backup or migration.

## 2. Tech Stack

### Frontend
- **React 19** + **TypeScript** + **Vite**
- **Tanstack Router** — routing
- **Tanstack Query** — server state
- **Zustand** — global client state
- **Axios** — HTTP client
- **Mantine** (`@mantine/core`, `@mantine/form`) — UI + forms
- **Zod** — schema validation
- **ApexCharts** — dashboard visualizations

Coding standards live in [CLAUDE.md](CLAUDE.md).

### Backend
- **Python** + **Django REST Framework**
- **SQLite** (initial; replaceable later without API changes)
- File storage for transaction attachments (image / PDF)

## 3. Core Features

### 3.1 Dashboard
Landing screen summarizing the user's finances:

- Total balance across accounts.
- Period summary: total income, total expense, net.
- Spending by category (chart).
- Income vs. expense trend (chart).
- Recent transactions list.
- Budget progress (each active budget with a usage bar).

Period selector: this month / last month / custom range.

### 3.2 Categories
Reusable labels for transactions.

| Field | Type        | Rules                                                        |
| ----- | ----------- | ------------------------------------------------------------ |
| name  | string      | required, unique within a type                               |
| type  | enum        | `income` or `expense` — fixed at creation, not editable      |
| icon  | string      | picked from a preset icon list (no custom uploads)           |

Rules:
- A category cannot be deleted if it is referenced by any transaction or budget.
- The type cannot change once set (changing it would break historical reports).

### 3.3 Accounts
Sources/holders of money — bank, wallet, cash, card, etc.

| Field          | Type    | Rules                                              |
| -------------- | ------- | -------------------------------------------------- |
| name           | string  | required, unique                                   |
| initial_amount | decimal | required, can be zero or negative                  |
| notes          | string  | optional                                           |

Behavior:
- **Current balance** = `initial_amount` + sum of incoming transactions − sum of outgoing transactions (incl. transfers).
- An account can be edited at any time.
- An account can be **deleted only if it has no transactions** (incoming, outgoing, or transfer) and no budgets attached.

### 3.4 Budgets
A spending cap for a single expense category on a single account over a duration.

| Field    | Type     | Rules                                                          |
| -------- | -------- | -------------------------------------------------------------- |
| amount   | decimal  | required, > 0                                                  |
| category | FK       | required, must be of type `expense`                            |
| account  | FK       | required                                                       |
| duration | enum     | `weekly`, `monthly`, `quarterly`, `yearly`, or `custom` range  |
| start_at | date     | required for custom; derived otherwise                         |
| end_at   | date     | required for custom; derived otherwise                         |

Behavior:
- Only expense categories may be selected.
- **Used amount** = sum of matching expense transactions within the duration.
- **Remaining** = `amount − used`. UI highlights when ≥ 80% used and when exceeded.

### 3.5 Transactions
The atomic financial event. Three kinds:

- **Expense** — money leaves an account.
- **Income** — money enters an account.
- **Transfer** — money moves from one account to another (no category required).

Common fields:

| Field      | Type            | Rules                                                                              |
| ---------- | --------------- | ---------------------------------------------------------------------------------- |
| kind       | enum            | `expense` / `income` / `transfer`                                                  |
| amount     | decimal         | required, > 0                                                                      |
| account    | FK              | required (source for transfer)                                                     |
| to_account | FK              | required if `kind = transfer`, must differ from `account`                          |
| category   | FK              | required for `expense` and `income`; must match the kind; **not used for transfer**|
| date       | date / datetime | required                                                                           |
| notes      | string          | optional                                                                           |
| attachment | file            | optional, image (`png`, `jpg`, `jpeg`, `webp`) or `pdf`, size cap (e.g. 5 MB)      |

Rules:
- Transfer transactions don't count toward income/expense totals or budgets — they only move balance.
- Editing an existing transaction recomputes balances and budget usage.
- Deleting is allowed; balances recompute.

### 3.6 Calendar
Month / week view showing transactions on their dates.

- Day cell shows: count of transactions, net amount (positive/negative coloring).
- Clicking a day opens the day's transaction list.
- Quick-add transaction from a date cell.

### 3.7 Import / Export

**Export**
- Full data dump: accounts, categories, budgets, transactions.
- Format: JSON (canonical) and CSV per entity.
- Attachments not included in CSV; bundled into a ZIP for JSON exports.

**Import**
- Accepts the JSON export format.
- Validates with Zod on the client and DRF serializers on the server.
- Conflict policy on duplicate names: skip / overwrite / rename (user choice per import).
- Pre-import preview: counts per entity, errors per row.

## 4. Domain Model

```
Account 1 ──< Transaction >── 1 Category (nullable for transfers)
Account 1 ──< Budget >────── 1 Category (expense only)
Transaction (transfer) ── to_account ──> Account
Transaction 0..1 ── Attachment
```

### Entities (logical)

- **Category** `{ id, name, type, icon, created_at }`
- **Account** `{ id, name, initial_amount, notes, created_at }`
- **Budget** `{ id, amount, category_id, account_id, duration, start_at, end_at, created_at }`
- **Transaction** `{ id, kind, amount, account_id, to_account_id?, category_id?, date, notes, attachment?, created_at }`
- **Attachment** `{ id, transaction_id, file, mime_type, size }`

## 5. Frontend Module Layout

Following the structure in [CLAUDE.md](CLAUDE.md), each domain is a feature module:

```
src/features/
├── dashboard/      # widgets, charts, period selector
├── categories/     # list, create, edit, delete; icon picker
├── accounts/       # list, create, edit, delete (guarded); balance calc
├── budgets/        # list, create, edit, delete; progress display
├── transactions/   # list, filters, create/edit (expense/income/transfer), attachments
├── calendar/       # month/week view, day drill-down, quick add
└── data/           # import/export flows
```

Shared concerns:

- `src/lib/apiClient.ts` — Axios instance with auth interceptor.
- `src/lib/queryClient.ts` — Tanstack Query client.
- `src/validations/` — Zod schemas reused across forms and import validation.
- `src/stores/` — global stores (auth, user preferences, theme).

## 6. API Surface (REST, high level)

Base path: `/api/v1/`

| Resource       | Endpoints                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------ |
| Categories     | `GET/POST /categories`, `GET/PATCH/DELETE /categories/{id}`                                |
| Accounts       | `GET/POST /accounts`, `GET/PATCH/DELETE /accounts/{id}`, `GET /accounts/{id}/balance`      |
| Budgets        | `GET/POST /budgets`, `GET/PATCH/DELETE /budgets/{id}`, `GET /budgets/{id}/progress`        |
| Transactions   | `GET/POST /transactions`, `GET/PATCH/DELETE /transactions/{id}`                            |
| Attachments    | `POST /transactions/{id}/attachment`, `DELETE /transactions/{id}/attachment`               |
| Calendar       | `GET /calendar?month=YYYY-MM` (aggregated per-day summary)                                 |
| Dashboard      | `GET /dashboard/summary?from=&to=`                                                         |
| Import/Export  | `GET /export?format=json|csv`, `POST /import` (multipart)                                  |

Query filters on `/transactions`: `kind`, `category`, `account`, `from`, `to`, `q` (search notes), pagination (`page`, `page_size`).

Responses follow the shape:

```ts
interface IApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

interface IPaginatedResponse<T> {
  data: T[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}
```

## 7. Validation Rules (summary)

- `amount` is always a positive decimal with 2 fractional digits.
- `date` cannot be in the far future (configurable cap, e.g. +1 year).
- Transfer requires two **distinct** accounts.
- Category type must match transaction kind for `expense` / `income`.
- Budget category must be `expense`.
- Attachment MIME must be in the allowed list; size capped server-side.

## 8. Non-Functional

- **Auth**: token-based (JWT or DRF token). Tokens stored per [CLAUDE.md](CLAUDE.md) security guidance.
- **Currency**: single currency for now (configurable in user preferences); multi-currency is out of scope.
- **Timezone**: store dates in UTC; display in the user's local timezone.
- **Offline**: not in scope for v1.
- **Backups**: handled via the export feature.

## 9. Out of Scope (v1)

- Multi-user / sharing.
- Multi-currency conversion.
- Recurring transactions (planned for v2).
- Bank-feed integrations.
- Mobile apps (web-responsive only).
