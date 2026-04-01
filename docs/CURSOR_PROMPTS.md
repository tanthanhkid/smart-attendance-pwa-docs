# Cursor Prompt Pack

## Prompt 1 — init monorepo
```text
Read README.md, PROJECT_SCAFFOLD.md, .cursorrules, docs/PRODUCT_SPEC.md, docs/TECH_SPEC.md.

Create a pnpm monorepo with:
- apps/web = Next.js App Router + TypeScript + Tailwind
- apps/api = NestJS + Prisma
- packages/shared-types

Add root scripts, tsconfig base, package configs, and folder structure exactly like PROJECT_SCAFFOLD.md.
Do not implement business logic yet.
```

## Prompt 2 — auth + RBAC
```text
Read docs/API_SPEC.md and docs/DB_SCHEMA.md.

Implement auth for NestJS with:
- login
- refresh token
- logout
- JWT guards
- role guard
- demo seed users for ADMIN / MANAGER / EMPLOYEE

Keep controllers thin and business logic in services.
```

## Prompt 3 — Prisma schema
```text
Read apps/api/prisma/schema.prisma, docs/DB_SCHEMA.md, docs/SCALING_STRATEGY.md.

Complete the Prisma schema and generate migrations for:
branches, branch geofence, departments, employees, users, attendance sessions, attendance events, attendance flags, approval requests, audit logs, device registrations.
Preserve indexes for branch-heavy and employee-heavy queries.
```

## Prompt 4 — branch CRUD
```text
Implement NestJS branch module with:
- GET /branches
- POST /branches
- GET /branches/:id
- PATCH /branches/:id
- DELETE /branches/:id
- PUT /branches/:id/geofence

Add DTO validation, pagination, filtering, and audit logging.
```

## Prompt 5 — employee PWA shell
```text
Build the employee mobile-first PWA shell in Next.js:
- login screen
- home screen
- today attendance card
- check-in button
- history list
- permission explanation state
- loading, empty, error states

Do not use unsupported browser APIs.
```

## Prompt 6 — attendance flow
```text
Implement attendance check-in/check-out end to end.

Requirements:
- geolocation input from client
- server-side geofence validation
- nonce/idempotency
- risk scoring
- allow / allow_with_flag / reject decision
- attendance session and events
- response includes distanceMeters, attendanceStatus, riskLevel, flagged
```

## Prompt 7 — dashboard
```text
Create responsive dashboards for:
- admin system summary
- manager branch summary

Include filters by date range, branch, department and metrics:
- present
- late
- absent
- overtime
- flagged attendance
```

## Prompt 8 — reports + export
```text
Implement reports listing and export queue.
Use Redis/BullMQ for async export jobs.
Support filters and pagination.
```

## Prompt 9 — tests
```text
Add unit tests and integration tests for:
- geofence calculation
- risk score
- auth
- branch CRUD
- attendance check-in/check-out
```
