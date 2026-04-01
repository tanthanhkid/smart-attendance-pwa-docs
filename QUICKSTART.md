# Quick Start

## Local-first setup

### 1. Prepare environment

```bash
pnpm install
cp .env.example .env
```

Current local defaults expect:

- PostgreSQL on `localhost:5432`
- Database name `smart_attendance`
- Database user `mtc_admin`
- Redis is optional for boot, not required for the local start path

### 2. Verify PostgreSQL

The app expects a reachable local PostgreSQL instance from `DATABASE_URL` in [`.env`](./.env).

You can verify it with:

```bash
pnpm check:db
```

If it is not reachable, start your local PostgreSQL service or update `DATABASE_URL` in [`.env`](./.env).

### 3. Sync schema and seed demo data

```bash
pnpm --filter @smart-attendance/api db:push
pnpm --filter @smart-attendance/api db:seed
```

Current demo seed creates:

- 5 branches
- 5 managers
- 50 employees
- sample attendance history for seeded employees

### 4. Start the apps

Terminal 1:

```bash
pnpm dev:api
```

Terminal 2:

```bash
pnpm dev:web
```

### 5. Open the app

| Service | URL |
|---|---|
| Web App | http://localhost:3000 |
| API | http://localhost:4000 |
| Swagger | http://localhost:4000/docs |

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@smart-attendance.com | admin123 |
| Manager | manager1@smart-attendance.com | manager123 |
| Employee | employee1@smart-attendance.com | employee123 |

## Convenience scripts

- Windows: `start.bat`
- Unix/macOS: `./start.sh`

Both scripts assume local PostgreSQL and do not require Docker to boot the app.
