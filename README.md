# Expensify

A personal money tracker for income, expenses and transfers across your own accounts, with
budgets, recurring entries, reports and alerts. Amounts are shown the Nepali way
("Rs 12,34,567.50").

This repository holds the **React web app** and a small **Express mock API** that stands in
for the backend while it's built. The real backend will be **Django + PostgreSQL**; its
contract (endpoints, payloads, data model and rules) is in
[docs/requirements.md](docs/requirements.md).

## Features

| Area           | What you can do                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Sign-in        | Sign up, log in with username or email, stay logged in until you log out                                            |
| Dashboard      | A month's income, expense, net and savings rate, balances, spending by category, budgets, a 6-period trend, recent and upcoming entries, privacy mode |
| Transactions   | Add, edit, duplicate and delete income, expenses and transfers; filter, search, group by day; export to Excel or PDF |
| Accounts       | Cash, bank, credit card, wallet, savings, loan and other accounts with live balances; reconcile, archive, account page |
| Categories     | Expense and income categories with icons and colors; archive; restore the defaults                                  |
| Budgets        | Weekly, monthly or yearly limits for all expenses or chosen categories, with rollover, alerts and history           |
| Recurring      | Salary, rent and subscriptions on a schedule, added automatically or after you confirm                              |
| Reports        | Cash flow, spending by category, category trends, accounts and net worth, budget history; Excel and PDF export      |
| Alerts         | Budget alerts, bill reminders and a daily reminder, in a list behind the header's bell and as system notifications  |
| Settings       | Profile and photo, password, theme (light, dark, system), notifications, delete all transactions, delete account   |

## Tech stack

| Area               | Library                                                          |
| ------------------ | ---------------------------------------------------------------- |
| UI framework       | React 19 with the React Compiler, TypeScript (strict)            |
| Components         | lumen-ui (`@lumen-ui/react`, bundled as `lumen-ui-react-0.1.0.tgz`) |
| Build / dev server | Vite                                                             |
| Routing            | TanStack Router, file-based from `src/routes/`                   |
| Server state       | TanStack Query                                                   |
| Client state       | zustand (login session, alert list)                              |
| HTTP               | axios (`src/lib/apiClient.ts`)                                   |
| Forms + validation | react-hook-form + zod                                            |
| Styling            | SCSS with theme tokens (`src/styles/_colors.scss`)               |
| Exports            | Excel by a small built-in writer; PDF with jsPDF + jspdf-autotable |
| Mock backend       | Express (`mock-server/server.js`)                                |
| Planned backend    | Django + Django REST framework + PostgreSQL                      |

## Getting started

You need Node.js 22 LTS or newer.

```bash
npm install
cp .env.example .env
npm run dev:all   # mock API on http://localhost:3000 + app on http://localhost:5173
```

Or run the two halves in separate terminals: `npm run mock-api` and `npm run dev`.

Open http://localhost:5173 and log in with **admin / admin**, or create an account at `/signup`.

## Scripts

| Script             | What it does                                           |
| ------------------ | ------------------------------------------------------ |
| `npm run dev`      | Vite dev server (app only)                             |
| `npm run mock-api` | Express mock API on port 3000                          |
| `npm run dev:all`  | Both of the above in one terminal (via `concurrently`) |
| `npm run build`    | Type-check (`tsc -b`) and build for production         |
| `npm run preview`  | Serve the production build locally                     |
| `npm run lint`     | ESLint                                                 |

## Environment variables

Copy `.env.example` to `.env`. Variables are validated on startup in `src/config/env.ts`, and
the app refuses to boot with a bad value.

| Variable            | Default                 | Notes                                    |
| ------------------- | ----------------------- | ---------------------------------------- |
| `VITE_APP_ENV`      | `dev`                   | `dev`, `qa` or `prod`                    |
| `VITE_API_BASE_URL` | `http://localhost:3000` | The API the app talks to                 |
| `VITE_API_TIMEOUT`  | `30000`                 | Request timeout in milliseconds          |

To run the app against the Django API instead of the mock, point `VITE_API_BASE_URL` at it.

## Project structure

```
docs/
  requirements.md        Functional requirements, API contract, data model, Django plan
mock-server/
  server.js              Express mock API: every endpoint the app uses
  db.json                Created on first run, git-ignored; delete it to reset the data
src/
  config/env.ts          Validates VITE_* env vars with zod, exports `config`
  lib/                   apiClient (axios), apiError, queryClient, router, files/ (Excel, PDF, zip)
  providers/             AppProviders: TanStack Query + lumen-ui + router
  components/            Shared UI: layout (sidebar, header, account menu), sheet, charts,
                         grouped table, empty state, progress bar, icon picker
  features/
    auth/                Login and signup pages, session store, profile and preference queries
    dashboard/           The dashboard and its cards
    transactions/        List, filters, form, detail page, Excel/PDF export
    accounts/            List, account page, form, reconcile
    categories/          List, form, icon picker
    budgets/             List, detail page, form, alerts
    recurring/           Rules, rule page, form, the runner that adds due entries
    reports/             Report cards and the five report pages, Excel/PDF export
    notifications/       Alert list behind the bell, daily and bill reminders
    settings/            Profile, password, appearance, notifications, data and account deletion
  routes/                File-based routes; thin files that render a feature component
    _authenticated.tsx   Layout and login guard for every page except /login and /signup
  routeTree.gen.ts       Generated by @tanstack/router-plugin; never edit it by hand
  styles/                Theme tokens, utilities, lumen-ui adjustments, sheet form layout
  utils/                 Money formatting (amount.ts), local dates and periods (date.ts)
```

## Conventions

- **Features are self-contained.** Each folder under `src/features/` has the same files:
  `*.types.ts` (API shapes), `*.api.ts` (axios calls), `*.query.ts` (TanStack Query hooks),
  `*.domain.ts` (pure rules, no React), `*.labels.ts` (display text), `*.actions.tsx`
  (dialogs and sheets a page opens), `components/`, and a barrel `index.ts`.
- **Route files stay thin.** They validate search params and render a feature component.
  Page state that should survive Back (periods, filters) lives in the URL.
- **`@/`** is an alias for `src/`, set in both `vite.config.ts` and `tsconfig.app.json`.
- **Forms open in sheets**: a side drawer on desktop, a bottom sheet on phones (under 600px).
  Components rendered inside a sheet can't use router hooks or `useSheet`; they close with a
  result and the page acts on it.
- **Money** is a plain number in the account's currency (`1234.5`), formatted by
  `formatMoney` in `src/utils/amount.ts`. Sums run in thousandths to avoid float noise.
- **Dates** are local calendar dates written `YYYY-MM-DD`, so an entry never moves to another
  day with the time zone. Weeks run Monday to Sunday; months and years follow the calendar.
- **API errors** are `{ "message": "..." }`. A missing or invalid token answers **403**, which
  logs the user out (`src/lib/apiClient.ts`); a wrong password answers **401**, which doesn't.

## Backend

### Mock API (today)

`mock-server/server.js` implements every endpoint the app calls, against a JSON file. It's
for local development only:

- Tokens are `mock-token-<username>` and never expire.
- Every user shares one set of data. Deleting any account empties it for everyone, and
  deleting the last user reseeds the demo data.
- Restart it after editing `server.js`; it doesn't reload by itself.
- Delete `mock-server/db.json` to start over from the seed.

| Resource     | Endpoints                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth         | `POST /auth/login`, `POST /auth/register`                                                                                                                                 |
| Profile      | `GET /me`, `PATCH /me`, `PATCH /me/preferences`, `POST /me/password`, `DELETE /me`                                                                                        |
| Accounts     | `GET /accounts`, `GET /accounts/:id`, `POST /accounts`, `PUT /accounts/:id`, `PATCH /accounts/:id/archived`, `POST /accounts/:id/reconcile`, `DELETE /accounts/:id`       |
| Categories   | `GET /categories`, `GET /categories/:id`, `POST /categories`, `POST /categories/defaults`, `PUT /categories/:id`, `PATCH /categories/:id/archived`, `DELETE /categories/:id` |
| Transactions | `GET /transactions`, `GET /transactions/:id`, `POST /transactions`, `PUT /transactions/:id`, `DELETE /transactions/:id`, `DELETE /transactions`                           |
| Budgets      | `GET /budgets`, `GET /budgets/:id`, `POST /budgets`, `PUT /budgets/:id`, `PATCH /budgets/:id/active`, `PATCH /budgets/:id/alert`, `DELETE /budgets/:id`                   |
| Recurring    | `GET /recurring`, `GET /recurring/:id`, `POST /recurring`, `PUT /recurring/:id`, `PATCH /recurring/:id/active`, `POST /recurring/:id/occurrences`, `POST /recurring/:id/skip`, `DELETE /recurring/:id` |

Every endpoint except the two under `/auth` needs `Authorization: Bearer <token>`.

### Django + PostgreSQL (planned)

The Django API replaces the mock without changes to the app: same paths, same JSON (camelCase
fields, integer IDs, `YYYY-MM-DD` dates, amounts as JSON numbers), same status codes. Unlike
the mock, it keeps each user's data separate. See
[docs/requirements.md](docs/requirements.md), sections 7 to 10, for the data model, the full
API contract and the implementation notes.
