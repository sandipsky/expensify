# Expensify

A personal money tracker for income, expenses and transfers across your own accounts, with
budgets, recurring entries, reports and alerts. Amounts are shown the Nepali way
("Rs 12,34,567.50").

This repository holds the **React web app**. There's no server of our own: the app signs
people in with **Firebase Authentication** and keeps each user's data in **Cloud Firestore**,
guarded by the security rules in [firestore.rules](firestore.rules), the same way the
Angular app expensify-web does. The data model and every read and write the app makes are
in [docs/requirements.md](docs/requirements.md) (sections 8 and 9), and
[docs/firebase.md](docs/firebase.md) walks through connecting a Firebase project.

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
| Settings       | Profile and photo, email (switches once its link is opened), password, theme, notifications, delete all transactions, delete account |

## Tech stack

| Area               | Library                                                          |
| ------------------ | ---------------------------------------------------------------- |
| UI framework       | React 19 with the React Compiler, TypeScript (strict)            |
| Components         | lumen-ui (`@lumen-ui/react`, bundled as `lumen-ui-react-0.1.0.tgz`) |
| Build / dev server | Vite                                                             |
| Routing            | TanStack Router, file-based from `src/routes/`                   |
| Server state       | TanStack Query                                                   |
| Backend            | Firebase JS SDK: Authentication and Cloud Firestore              |
| Client state       | zustand (the alert list)                                         |
| Forms + validation | react-hook-form + zod                                            |
| Styling            | SCSS with theme tokens (`src/styles/_colors.scss`)               |
| Exports            | Excel by a small built-in writer; PDF with jsPDF + jspdf-autotable |

## Getting started

You need Node.js 22 LTS or newer, and for the local Firebase emulators, Java 11 or newer and
the Firebase CLI (`npm install -g firebase-tools`).

```bash
npm install
cp .env.example .env   # points the app at the local emulators
npm run emulators      # terminal 1: Auth and Firestore emulators, their UI on http://localhost:4000
npm run dev            # terminal 2: the app on http://localhost:5173
```

Open http://localhost:5173 and create an account at `/signup`. Every account starts with the
default categories and nothing else; each user only ever sees their own data.

The emulators save their data to `.emulator-data/` when you stop them with Ctrl+C and load it
next time. Delete that folder to start over, or wipe the data in the emulator UI.

To use a real Firebase project instead, follow [docs/firebase.md](docs/firebase.md): put its
values in `.env`, set `VITE_FIREBASE_USE_EMULATORS=false` and deploy the rules.

## Scripts

| Script                 | What it does                                                          |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                                       |
| `npm run emulators`    | Firebase Auth and Firestore emulators (project `demo-expensify`), keeping their data in `.emulator-data/` |
| `npm run test:rules`   | Check `firestore.rules` against the running emulators (`tests/rules.test.cjs`) |
| `npm run build`        | Type-check (`tsc -b`) and build for production                        |
| `npm run preview`      | Serve the production build locally                                    |
| `npm run lint`         | ESLint                                                                |
| `npm run deploy:rules` | Deploy `firestore.rules` and `firestore.indexes.json` to the Firebase project in `.firebaserc` |

## Environment variables

Copy `.env.example` to `.env`. Variables are validated on startup in `src/config/env.ts`, and
the app refuses to boot with a bad value. The Firebase values are public by design: anyone can
read them from the built app, and the security rules are what protect the data.

| Variable                            | Example                     | Notes                                                       |
| ----------------------------------- | --------------------------- | ----------------------------------------------------------- |
| `VITE_APP_ENV`                      | `dev`                       | `dev`, `qa` or `prod`                                       |
| `VITE_FIREBASE_API_KEY`             | `AIzaSy…`                   | From the Firebase console's web app settings                |
| `VITE_FIREBASE_AUTH_DOMAIN`         | `my-project.firebaseapp.com` |                                                            |
| `VITE_FIREBASE_PROJECT_ID`          | `my-project`                | `demo-expensify` for the emulators                          |
| `VITE_FIREBASE_APP_ID`              | `1:123…:web:abc…`           |                                                             |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `123456789012`              | Optional                                                    |
| `VITE_FIREBASE_USE_EMULATORS`       | `true`                      | `true` talks to `npm run emulators` instead of the project  |
| `VITE_APP_CHECK_SITE_KEY`           |                             | Optional reCAPTCHA Enterprise key; empty runs without App Check |
| `VITE_APP_CHECK_DEBUG`              | `false`                     | `true` registers an App Check debug token; local only       |

## Deploying the web app (Netlify)

Netlify hosts the web app as a static site; `netlify.toml` holds the build command, the
publish folder, the Node version, the single-page-app fallback (so a refresh on
`/transactions` still loads the app) and a few security and cache headers. The data lives in
Firebase, so there's nothing else to host.

1. Set up the Firebase project and deploy the rules ([docs/firebase.md](docs/firebase.md)).
   Until the rules are deployed, a production-mode database refuses every read.
2. In Netlify, **Add new project → Import an existing project**, pick GitHub and this
   repository, and keep the build settings it reads from `netlify.toml`.
3. Before the first deploy, add the `VITE_FIREBASE_*` values from the table above under
   **Project configuration → Environment variables**, with `VITE_FIREBASE_USE_EMULATORS` left
   out or `false`, and `VITE_APP_ENV` set to `prod`. Vite bakes them in at build time, so
   changing one needs a new deploy. Without them the site loads as a blank page with an
   error in the console.
Every push to `main` then deploys, and pull requests get deploy previews. Previews use the
same Firebase project unless you set other values for the **Deploy Previews** context.

## Project structure

```
firebase.json            Firebase CLI: which rules and indexes to deploy, emulator ports
firestore.rules          Security rules: each user's data is theirs alone, every write checked
firestore.indexes.json   Composite indexes (none needed today)
tests/rules.test.cjs     Security-rules checks, run by `npm run test:rules`
netlify.toml             Netlify build, single-page-app fallback and headers
docs/
  requirements.md        Functional requirements, Firestore data model, data access and rules
  firebase.md            Connecting a Firebase project, step by step
src/
  config/env.ts          Validates VITE_* env vars with zod, exports `config`
  lib/
    firebase.ts          Firebase app, App Check and Auth (the first download needs these)
    firestore.ts         Firestore, user paths, timestamps, batched writes (loaded on first use)
    errors.ts            AppError codes and messages for Firebase errors
                         and queryClient, router, files/ (Excel, PDF, zip)
  providers/             AppProviders: TanStack Query + lumen-ui + router
  components/            Shared UI: layout (sidebar, header, account menu), sheet, charts,
                         grouped table, empty state, progress bar, icon picker
  features/
    auth/                Login and signup pages, the Firebase session, profile and preference queries
    dashboard/           The dashboard and its cards
    transactions/        List, filters, form, detail page, Excel/PDF export
    accounts/            List, account page, form, reconcile
    categories/          List, form, icon picker, default categories
    budgets/             List, detail page, form, alerts
    recurring/           Rules, rule page, form, the runner that adds due entries
    reports/             Report cards and the five report pages, Excel/PDF export
    notifications/       Alert list behind the bell, daily and bill reminders
    settings/            Profile, email, password, appearance, notifications, data and account deletion
  routes/                File-based routes; thin files that render a feature component
    _authenticated.tsx   Layout and login guard for every page except /login and /signup
  routeTree.gen.ts       Generated by @tanstack/router-plugin; never edit it by hand
  styles/                Theme tokens, utilities, lumen-ui adjustments, sheet form layout
  utils/                 Money formatting (amount.ts), local dates and periods (date.ts)
```

## Conventions

- **Features are self-contained.** Each folder under `src/features/` has the same files:
  `*.types.ts` (data shapes), `*.api.ts` (Firestore reads and writes), `*.query.ts` (TanStack
  Query hooks), `*.domain.ts` (pure rules, no React), `*.labels.ts` (display text),
  `*.actions.tsx` (dialogs and sheets a page opens), `components/`, and a barrel `index.ts`.
- **Only `*.api.ts` touches Firestore.** The query hooks load their API module on first use
  (`const api = () => import('./x.api')`), which keeps the Firestore SDK out of the first
  download. Don't import an `*.api.ts` file statically from anywhere else.
- **A write and its balance moves are one write.** An entry and the `increment()` on each
  account it touches go in the same Firestore transaction or batch. Change `firestore.rules`
  in the same commit as any field a write adds or renames, or the rules refuse it.
- **Route files stay thin.** They validate search params and render a feature component.
  Page state that should survive Back (periods, filters) lives in the URL.
- **`@/`** is an alias for `src/`, set in both `vite.config.ts` and `tsconfig.app.json`.
- **Forms open in sheets**: a side drawer on desktop, a bottom sheet on phones (under 600px).
  Components rendered inside a sheet can't use router hooks or `useSheet`; they close with a
  result and the page acts on it.
- **IDs** are Firestore's 20-character string IDs.
- **Money** is a plain number in the account's currency (`1234.5`), formatted by
  `formatMoney` in `src/utils/amount.ts`. Sums run in thousandths to avoid float noise.
- **Dates** are local calendar dates written `YYYY-MM-DD`, so an entry never moves to another
  day with the time zone. Weeks run Monday to Sunday; months and years follow the calendar.
  `createdAt` and `updatedAt` are Firestore server timestamps, read as ISO strings.
- **Errors** the screens act on are `AppError`s with a code (`src/lib/errors.ts`): a wrong
  password goes on the password field, a taken username or email on its own field, and a
  recurring date another tab already handled (`stale`) isn't reported. Everything else shows
  `getErrorMessage(error)`.
- **The session** is Firebase's, kept in IndexedDB and shared by every tab. When it ends
  elsewhere (logout in another tab, a deleted login), the open tab goes to `/login`.

## Testing the rules

`firestore.rules` is the only thing standing between one user and another's data.
With `npm run emulators` running, `npm run test:rules` runs `tests/rules.test.cjs`: the
writes the app makes must pass, and another user's data, a second username and malformed
documents must be refused. It loads `firestore.rules` as the file is now, keeps its documents in
a project of its own (`demo-rules-test`) and deletes the logins it creates, so the app's data in
the same emulators is left alone. Add a case with every rules change.

In the app, a refused write shows `permission-denied` in the browser console, and the
emulator's log (`firestore-debug.log`) names the rule that refused it.
