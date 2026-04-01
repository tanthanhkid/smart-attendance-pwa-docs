# Smart Attendance PWA

## Start Local

### Windows

Run:

```bash
start.bat
```

### Linux / macOS

Run:

```bash
chmod +x start.sh
./start.sh
```

## What the local start expects

- `pnpm install` has been run
- PostgreSQL is reachable from `DATABASE_URL`
- [`.env`](./.env) contains a valid `DATABASE_URL`

## Manual flow

```bash
pnpm install
pnpm check:db
pnpm --filter @smart-attendance/api db:push
pnpm --filter @smart-attendance/api db:seed
pnpm dev:api
pnpm dev:web
```

## Endpoints

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`

## Demo accounts

- `admin@smart-attendance.com / admin123`
- `manager1@smart-attendance.com / manager123`
- `employee1@smart-attendance.com / employee123`

## Notes

- This repo is pnpm-first.
- Docker is optional for local work, not the main boot path.
- Demo seed is intentionally small: 5 branches and 50 employees.
- Current local PostgreSQL default in project docs is `mtc_admin / mtc_secret_2026`.
