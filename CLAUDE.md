# CLAUDE.md

Frontend coding standards for this project. All contributions must follow these guidelines for consistency, maintainability, and quality.

## Project Summary

**Expensify** — a personal finance app for tracking income, expenses, and transfers across multiple accounts.

Core domains (each lives under `src/features/<name>/`):

- **Dashboard** — totals, charts (spending by category, income vs. expense trend), recent transactions, budget progress; with a period selector.
- **Categories** — `name`, `type` (`income` or `expense`, immutable), `icon` (from presets). Cannot be deleted if referenced by a transaction or budget.
- **Accounts** — bank / wallet / cash. Fields: `name`, `initial_amount`, `notes`. Current balance is derived from `initial_amount` + transactions. Deletable only if unused.
- **Budgets** — expense-only. Fields: `amount`, `category` (expense), `account`, `duration` (weekly / monthly / quarterly / yearly / custom). Tracks `used` vs. `remaining`.
- **Transactions** — three kinds: `expense`, `income`, `transfer`. Fields: `amount`, `account` (+ `to_account` for transfers), `category` (not for transfers), `date`, `notes`, optional `attachment` (image / PDF). Transfers don't affect totals or budgets — they only move balance.
- **Calendar** — month / week view with per-day net and a quick-add from a date cell.
- **Import / Export** — full data dump/restore (JSON canonical, CSV per entity).

**Backend**: Python + Django REST Framework on SQLite. Base path `/api/v1/`. Responses follow `IApiResponse<T>` / `IPaginatedResponse<T>` (see [TypeScript Guidelines](#typescript-guidelines)).

Full spec: [PROJECT.md](PROJECT.md).

## Technology Stack

| Category          | Technology         | Purpose                          |
| ----------------- | ------------------ | -------------------------------- |
| Framework         | React 19+          | UI library                       |
| Build Tool        | Vite               | Bundler & dev server             |
| Language          | TypeScript         | Typed JavaScript                 |
| State Management  | Zustand            | Global state                     |
| Data Fetching     | React Query        | Server state                     |
| HTTP Client       | Axios              | API requests                     |
| Forms             | Mantine Forms      | Form handling                    |
| Validation        | Zod                | Schema validation                |
| UI Library        | @mantine/core      | Component library                |
| Charts            | ApexCharts         | Data visualization               |
| Router            | Tanstack Router    | Client-side routing              |
| Runtime           | Node.js 22+        | JavaScript runtime               |

Do **not** introduce Husky or Biome to this project.

## Project Architecture

```
src/
├── main.tsx                    # App bootstrap
├── App.tsx                     # Root component
├── routes/                     # Tanstack Router route definitions
│   ├── __root.tsx
│   ├── Auth.tsx
│   └── Dashboard.tsx
├── components/                 # Pure reusable UI (no business logic)
│   ├── ui/                     # Buttons, Inputs, Modals
│   ├── layouts/                # Header, Sidebar, PageLayout
│   └── common/                 # Loader, ErrorBoundary
├── features/                   # Domain-based modules (CORE)
│   └── <feature>/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── store.ts
│       ├── types.ts
│       └── index.ts
├── lib/                        # Interchangeable library code
│   ├── apiClient.ts
│   └── queryClient.ts
├── config/                     # Global configuration
├── utils/                      # Small helpers
├── validations/                # Shared Zod schemas
├── stores/                     # Global Zustand stores only
├── types/                      # Truly global TS types
├── constants/                  # App-wide constants
├── styles/                     # Global styles
└── assets/                     # Images, fonts, icons
```

Domain logic belongs in `features/`. `components/` contains only pure, reusable UI with no business logic.

## File Naming Conventions

| Category   | Convention                       | Example                  |
| ---------- | -------------------------------- | ------------------------ |
| Components | PascalCase                       | `UserProfile.tsx`        |
| Hooks      | camelCase with `use` prefix      | `useAuth.ts`             |
| Utilities  | camelCase                        | `formatDate.ts`          |
| Types      | PascalCase with `I` prefix       | `IUser.ts`               |
| Constants  | SCREAMING_SNAKE_CASE in files    | `API_ENDPOINTS.ts`       |
| Stores     | camelCase with `Store` suffix    | `authStore.ts`           |

## Code Style & Formatting

- Indentation: 2 spaces
- Max line width: 100 characters
- Single quotes in TS/JS, double quotes in JSX
- Semicolons required
- Trailing commas (ES5 style)
- Arrow function parentheses always required

Linting is handled via ESLint (already configured in `eslint.config.js`).

## TypeScript Guidelines

`tsconfig.json` must enable strict mode:

```json
{
  "strict": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true,
  "forceConsistentCasingInFileNames": true
}
```

### Do

- Use explicit return types on all exported functions.
- Define interfaces for object shapes.
- Use type aliases for unions and primitives.
- Leverage utility types (`Partial`, `Pick`, `Omit`, `Record`).
- Use `const` assertions for literal values.
- Use the `satisfies` operator instead of widening assertions.
- Use discriminated unions for type-safe variants.
- Implement type guards for runtime checks.
- Let TypeScript infer types where possible — avoid redundant annotations and unnecessary casting.

```ts
// ❌ Don't
const value: string = 'hello';
const strLength: number = (value as string).length;

// ✅ Do
const value = 'hello';
const strLength = value.length;
```

### Don't

- Use `any` (prefer `unknown`).
- Disable checks with `@ts-ignore`.
- Use loose typing where strict typing is possible.
- Build overly complex generics.
- Use type assertions unnecessarily.

### Generic Response Types

```ts
// types/common.ts
export interface IApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface IPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  pagination: IPagination;
}
```

### Naming

- Interfaces: PascalCase with `I` prefix (e.g. `IUserProfile`).
- Type aliases: PascalCase (e.g. `Status`, `ID`).
- Generics: single uppercase letter or descriptive PascalCase (e.g. `T`, `TData`).
- Enums: PascalCase name, SCREAMING_SNAKE_CASE values.

## Routing (Tanstack Router)

- Group related routes under common layouts.
- Use nested routes for hierarchical navigation.
- Apply route-based code splitting with lazy loading.
- Define routes in a centralized configuration.
- Implement route guards for authentication.
- Type route parameters; validate with Zod; handle invalid/missing params gracefully.

## Environment Variables (Vite)

Never use `process.env` in this Vite project — use `import.meta.env`. All env vars must be prefixed with `VITE_` to be exposed to the client.

```ts
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.url('API base URL must be a valid URL'),
  VITE_API_TIMEOUT: z.string().transform((val) => Number.parseInt(val, 10)),
  VITE_APP_ENV: z.enum(['dev', 'prod', 'qa']),
});

function validateEnv() {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    for (const error of result.error.issues) {
      console.error(`  ${error.path.join('.')}: ${error.message}`);
    }
    throw new Error('Invalid environment configuration');
  }

  return result.data;
}

export const env = validateEnv();

export const config = {
  api: {
    baseUrl: env.VITE_API_BASE_URL,
    timeout: env.VITE_API_TIMEOUT,
  },
  app: {
    env: env.VITE_APP_ENV,
    isDev: env.VITE_APP_ENV === 'dev',
    isProd: env.VITE_APP_ENV === 'prod',
  },
} as const;
```

Never commit secrets. Local secrets live in `.env.local`; document required variables in `.env.example`.

## State Management (Zustand)

- Separate state and actions clearly in type definitions.
- Use selector functions for common selections to prevent unnecessary re-renders.
- Enable devtools in development.
- Persist only what is necessary (tokens, preferences).
- Use descriptive action names for devtools visibility.
- Global stores belong in `src/stores/`; feature-scoped stores belong in `features/<feature>/store.ts`.

## Data Fetching (Tanstack Query)

### Query Keys

Use a hierarchical structure:

- `['resource', 'list']` — lists
- `['resource', 'list', filters]` — filtered lists
- `['resource', 'detail', id]` — single items

Export query key factories for reusability.

### Defaults

- Stale time: 1 minute
- Cache time: 5 minutes
- Retry: 1
- Refetch on window focus: disabled

Tune per resource: longer stale times for static data, optimistic updates for interactive flows.

### Organization

- One custom hook per resource (e.g. `useUsers`, `useUser`).
- Group related queries in the same file.
- Handle errors in the hook layer.

### Advanced Patterns

- `useInfiniteQuery` — paginated/infinite scroll feeds, "load more", cursor-based pagination.
- `useQueries` — multiple independent queries in parallel (dynamic count of items, dashboard widgets, side-by-side comparisons).

### Mutations

After a successful mutation:

- Invalidate affected queries, **or** update the cache optimistically.
- Show success feedback.
- Handle errors gracefully.

## API Integration (Axios)

`lib/apiClient.ts` example:

```ts
import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { config } from '@/config/env';
import { useAuthStore } from '@/stores/authStore';

export const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response.data,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);
```

### Endpoint Organization

- Group endpoints by resource in separate files under each feature's `services/` directory.
- Use consistent CRUD naming.
- Export typed functions per endpoint.
- Handle errors at the call site or via a shared helper.

## UI Components & Styling

- Prefer `@mantine/core` primitives for UI.
- Use CSS Modules for complex component styles.
- Global styles only for app-wide concerns (`src/styles/`).
- No inline styles.
- Stick to a consistent spacing scale.

## Data Visualization (ApexCharts)

- Use dynamic imports to avoid SSR issues.
- Type chart configuration explicitly.
- Make charts responsive.
- Keep styling consistent across charts.

## Performance

- Rely on Vite's automatic route-based code splitting.
- Use dynamic `import()` for heavy components.
- Split vendor bundles where it pays off.

## Security

- Never commit secrets to version control.
- Document required env vars in `.env.example`; keep real values in `.env.local`.
- Store auth tokens securely; clear sensitive data on logout.
- Validate permissions on both client and server.
- Use secure session management.

```
# .env.example
VITE_APP_ENV=dev
VITE_API_BASE_URL=http://localhost:8000/api
VITE_API_TIMEOUT=30000
```
