# Expensify — Backend (Django + DRF)

REST API for the Expensify personal-finance app. Python + Django REST Framework
on SQLite, JWT auth, deployable to **Fly.io** or **PythonAnywhere** unchanged.

Implements the contract in [`../PROJECT.md`](../PROJECT.md): base path `/api/v1/`,
`IApiResponse<T>` / `IPaginatedResponse<T>` envelopes, snake_case fields,
server-generated UUID ids.

---

## Stack

| Concern        | Choice                                  |
| -------------- | --------------------------------------- |
| Framework      | Django 5.2 (LTS) + DRF 3.16             |
| Auth           | JWT (`djangorestframework-simplejwt`)   |
| DB             | SQLite (file on a persistent volume)    |
| Filtering      | `django-filter`                         |
| CORS           | `django-cors-headers`                   |
| Files          | Pillow (image attachments)              |
| Prod server    | Gunicorn + WhiteNoise                   |
| Config         | `django-environ` (env vars / `.env`)    |

## Project layout

```
backend/
├── manage.py
├── requirements.txt
├── Dockerfile / fly.toml / Procfile      # deployment
├── config/                               # project package
│   ├── settings/{base,dev,prod}.py       # split settings
│   ├── urls.py                           # /api/v1 router + routes
│   └── wsgi.py / asgi.py
└── apps/
    ├── common/                           # base models, envelope renderer,
    │                                     #   pagination, permissions, viewsets
    ├── users/                            # custom User + JWT login
    ├── categories/                       # income/expense categories
    ├── accounts/                         # accounts + derived balance
    ├── budgets/                          # budgets + usage/progress
    ├── transactions/                     # transactions + attachments + filters
    ├── dashboard/                        # summary + calendar aggregation
    └── data/                             # import/export + seed_demo command
```

Each feature app owns its `models / serializers / views / admin / migrations`.
Cross-cutting concerns (response envelope, owner-scoping, pagination) live in
`apps/common` so feature apps stay thin.

---

## Local development

```bash
cd backend
python -m venv .venv
# Windows PowerShell:  .venv\Scripts\Activate.ps1
# Git Bash / macOS / Linux:  source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env            # adjust if needed

python manage.py migrate
python manage.py seed_demo      # loads demo data -> admin / admin
python manage.py runserver      # http://127.0.0.1:8000
```

`seed_demo` loads the bundled demo dataset (`apps/data/seed_data.json`) into real
tables (fresh UUIDs, rebuilt relationships). Re-run with `--reset` to wipe and
reload. Create your own admin instead with `python manage.py createsuperuser`.

### Environment variables

| Variable                  | Default (dev)                  | Purpose                              |
| ------------------------- | ------------------------------ | ------------------------------------ |
| `DJANGO_SETTINGS_MODULE`  | `config.settings.dev`          | dev vs. prod settings                |
| `DJANGO_SECRET_KEY`       | `dev-insecure-change-me`       | **set a real value in prod**         |
| `DJANGO_DEBUG`            | `true` (dev)                   | debug mode                           |
| `DJANGO_ALLOWED_HOSTS`    | `localhost,127.0.0.1`          | comma-separated hosts                |
| `CORS_ALLOWED_ORIGINS`    | `http://localhost:5173,...`    | frontend origins (comma-separated)   |
| `CSRF_TRUSTED_ORIGINS`    | —                              | prod: https frontend origin(s)       |
| `DJANGO_DATA_DIR`         | `backend/data`                 | DB + media + static root             |
| `DJANGO_DB_PATH`          | `<DATA_DIR>/db.sqlite3`        | SQLite file path                     |
| `MAX_ATTACHMENT_SIZE`     | `5242880` (5 MB)               | attachment size cap                  |

---

## API reference

All routes are under `/api/v1/`. All except `auth/login` require
`Authorization: Bearer <token>`. Successful non-list responses are wrapped as
`{ "data": ..., "success": true }`; lists as `{ "data": [...], "pagination": {...} }`;
errors as `{ "success": false, "message": "...", "errors": ... }`.

| Method                | Path                               | Notes                                            |
| --------------------- | ---------------------------------- | ------------------------------------------------ |
| POST                  | `/auth/login`                      | `{username,password}` → `{token,refresh,user}`   |
| POST                  | `/auth/refresh`                    | `{refresh}` → `{access}`                         |
| GET                   | `/users/me`                        | current user                                     |
| GET/POST              | `/users`                           | admin only for writes                            |
| GET/PATCH/DELETE      | `/users/{id}`                      | admin only for writes                            |
| GET/POST              | `/categories`                      | filter `?type=expense`                           |
| GET/PATCH/DELETE      | `/categories/{id}`                 | `type` immutable; delete blocked if referenced   |
| GET/POST              | `/accounts`                        | each item includes derived `balance`             |
| GET/PATCH/DELETE      | `/accounts/{id}`                   | delete blocked if in use                         |
| GET                   | `/accounts/{id}/balance`           | derived balance                                  |
| GET/POST              | `/budgets`                         |                                                  |
| GET/PATCH/DELETE      | `/budgets/{id}`                    |                                                  |
| GET                   | `/budgets/{id}/progress`           | `used / remaining / percent` for current window  |
| GET/POST              | `/transactions`                    | filters below; paginated                         |
| GET/PATCH/DELETE      | `/transactions/{id}`               |                                                  |
| POST/DELETE           | `/transactions/{id}/attachment`    | multipart `file` upload / remove                 |
| GET                   | `/dashboard/summary?from=&to=`     | totals, charts, recent, budget progress          |
| GET                   | `/calendar?month=YYYY-MM`          | per-day net summary                              |
| GET                   | `/export?format=json\|csv`         | full backup (csv = zip of per-entity files)      |
| POST                  | `/import`                          | JSON backup + `policy=skip\|overwrite\|rename`   |

**Transaction filters:** `kind`, `category`, `account`, `from`, `to`, `q`
(notes search), `page`, `page_size`, `ordering` (e.g. `-date`).

### Validation rules enforced (PROJECT.md §7)
- `amount` must be > 0; `date` not more than 1 year in the future.
- Transfers require two **distinct** accounts and carry no category.
- Expense/income require a category whose `type` matches the kind.
- Budget category must be an `expense` category.
- Attachment must be png/jpeg/webp/pdf and within the size cap.
- Category `type` cannot change after creation.
- Accounts/categories referenced by other rows cannot be deleted.

---

## Deployment

The SQLite file and uploaded media live under `DJANGO_DATA_DIR`. In production
point it at a **persistent volume** so data survives redeploys.

### Fly.io

```bash
cd backend
fly launch --no-deploy                 # or use the provided fly.toml; pick an app name
fly volumes create expensify_data --size 1 --region iad
fly secrets set DJANGO_SECRET_KEY="$(python -c 'import secrets;print(secrets.token_urlsafe(50))')"
fly secrets set DJANGO_ALLOWED_HOSTS="your-app.fly.dev"
fly secrets set CORS_ALLOWED_ORIGINS="https://your-frontend.example"
fly secrets set CSRF_TRUSTED_ORIGINS="https://your-frontend.example"
fly deploy
fly ssh console -C "python manage.py seed_demo"   # optional demo data
```

`fly.toml` mounts the volume at `/data`; the Dockerfile runs migrations on boot
and serves with Gunicorn on port 8080.

### PythonAnywhere

1. Upload/clone the repo; create a virtualenv and `pip install -r backend/requirements.txt`.
2. **Web tab → WSGI config file**: point it at `config.wsgi`, set
   `os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.prod'`, and set the
   env vars (`DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS=<you>.pythonanywhere.com`,
   `CORS_ALLOWED_ORIGINS`, `DJANGO_DATA_DIR`).
3. Run in a console: `python manage.py migrate` and `python manage.py collectstatic --noinput`.
4. **Static files** mapping: URL `/static/` → `<DATA_DIR>/staticfiles`,
   URL `/media/` → `<DATA_DIR>/media`.
5. Reload the web app.

SQLite lives on the same disk on PythonAnywhere — no volume needed.

---

## Frontend integration

The React frontend talks to this backend directly (the old `json-server` mock
has been removed). The API layer adapts at the boundary so the rest of the
frontend stays camelCase:

- `.env.local` → `VITE_API_BASE_URL=http://localhost:8000/api/v1`
- `src/lib/apiClient.ts` → unwraps the `{ data }` / `{ data, pagination }`
  envelope and auto-converts snake_case ↔ camelCase (`src/lib/caseConvert.ts`).
- `features/auth` → calls `POST /auth/login` and stores the JWT.
- `features/{transactions,budgets}/services` → map the FK `*Id` suffix
  (`account`/`to_account`/`category` ↔ `accountId`/`toAccountId`/`categoryId`);
  transactions upload attachments via `POST /transactions/{id}/attachment`.

Run both together: `python manage.py runserver` here, and `npm run dev` in the
project root.

The dashboard/calendar still aggregate client-side from the full lists; the
server `/dashboard/summary` and `/calendar` endpoints are available if you want
to offload that later.
