# Smart Attendance PWA

![Monorepo](https://img.shields.io/badge/Monorepo-pnpm-F69220?logo=pnpm&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-336791?logo=postgresql&logoColor=white)
![Status](https://img.shields.io/badge/Status-Active%20Development-2563EB)

Smart Attendance PWA is a public monorepo for a branch-aware attendance system built with Next.js, NestJS, Prisma, and PostgreSQL. The project focuses on mobile-first attendance capture, manager review workflows, geolocation-based risk scoring, and a local-first developer setup that does not require Docker to get started.

## Overview

- Employee check-in and check-out with browser geolocation
- Risk-aware attendance flow with geofence, distance, accuracy, and speed checks
- Manager review queue for unrecorded or flagged sessions
- Attendance reports with CSV export and direct Google Maps links for event coordinates
- Admin settings for branch geofence and manager assignment
- Offline-friendly web app with queued attendance requests
- Public deployment behind Nginx with separate web and API runtimes

## Live Endpoints

- Web: [https://chamcong.phanmemtrinity.com](https://chamcong.phanmemtrinity.com)
- API Docs: [https://chamcong.phanmemtrinity.com/docs](https://chamcong.phanmemtrinity.com/docs)

## Product Behavior

Unlike traditional attendance apps that hard-block suspicious check-ins, this system accepts the event first and lets managers decide whether the session should be officially recorded. That keeps the employee flow lightweight while still preserving auditability and operational control.

Current important behavior:

- high-risk check-ins are stored, not silently discarded
- sessions can remain `unrecorded` until reviewed by a manager
- reports and dashboard surfaces clearly distinguish recorded and unrecorded attendance
- flagged sessions keep their risk score, review reasons, and raw location metadata
- review and report screens load the full filtered result set before deriving headline stats
- CSV export uses the same active report filters as the on-screen table

## Feature Set

### Employee

- login with role-aware access control
- check-in and check-out from mobile browser
- attendance history
- manual correction request flow
- offline queue for attendance requests when the network is unstable

### Manager and Admin

- dashboard summary
- review queue for flagged and unrecorded sessions
- attendance reporting with filters
- CSV export
- event coordinate inspection through Google Maps links in reports
- admin settings for branch geofence and manager-to-employee assignment

## Architecture

### Logical architecture

```mermaid
flowchart LR
    User["Employee / Manager / Admin"] --> Web["Next.js PWA (apps/web)"]
    Web --> Auth["JWT Auth + RBAC"]
    Web --> API["NestJS API (apps/api)"]

    subgraph Backend["Backend modules"]
        Auth --> Attendance["Attendance"]
        Auth --> Dashboard["Dashboard"]
        Auth --> Reports["Reports"]
        Auth --> Approvals["Approvals"]
        Attendance --> Risk["Risk scoring + geofence checks"]
        Dashboard --> Review["Manager review queue"]
        Reports --> Export["CSV export"]
    end

    Attendance --> Prisma["Prisma ORM"]
    Dashboard --> Prisma
    Reports --> Prisma
    Approvals --> Prisma
    Prisma --> Postgres["PostgreSQL"]

    Shared["packages/shared-types"] --> Web
    Shared --> API
```

### Runtime and deployment flow

```mermaid
flowchart TB
    Browser["Browser / Mobile PWA"] --> DNS["Cloudflare DNS"]
    DNS --> Nginx["Nginx reverse proxy"]
    Nginx --> WebRuntime["Next.js runtime on PM2 :3100"]
    Nginx --> ApiRuntime["NestJS runtime on PM2 :4100"]
    ApiRuntime --> Db["PostgreSQL"]
    Browser --> SW["Service worker + local queue"]
    SW --> WebRuntime
```

### Architecture notes

- `apps/web` contains the PWA used by employees, managers, and admins.
- `apps/api` exposes the REST API, Swagger docs, attendance logic, and reporting endpoints.
- `packages/shared-types` keeps shared contracts aligned between the frontend and backend.
- The attendance pipeline stores events first, then applies review state and recording rules.
- The current public deployment uses Nginx for routing and PM2 for process supervision.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, React Hook Form, Zod |
| Backend | NestJS 11, TypeScript, Swagger |
| Data | Prisma, PostgreSQL |
| Tooling | pnpm, Husky, lint-staged |
| Deployment | Nginx, PM2, Cloudflare DNS |

## Repository Structure

```text
apps/
  api/          # NestJS API
  web/          # Next.js PWA
packages/
  shared-types/ # shared DTOs and types
docs/           # product, architecture, API, DB, workflow docs
scripts/        # local helper scripts
```

## Getting Started

### Prerequisites

- Node.js
- `pnpm`
- PostgreSQL running locally
- a local database named `smart_attendance`

### Environment

Copy `.env.example` to `.env` and update values if needed. The current local-first setup expects a PostgreSQL connection like:

```env
DATABASE_URL=postgresql://mtc_admin:mtc_secret_2026@127.0.0.1:5432/smart_attendance?schema=public
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=4000
```

### Local setup

```bash
pnpm install
cp .env.example .env
pnpm check:db
pnpm db:push
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

### Default local URLs

- Web: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:4000](http://localhost:4000)
- Swagger: [http://localhost:4000/docs](http://localhost:4000/docs)

### Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | `admin@smart-attendance.com` | `admin123` |
| Manager | `manager1@smart-attendance.com` | `manager123` |
| Employee | `employee1@smart-attendance.com` | `employee123` |

## Common Commands

```bash
pnpm dev:api
pnpm dev:web
pnpm build
pnpm test
pnpm typecheck
pnpm db:push
pnpm db:seed
pnpm check:db
```

## Deployment Notes

### Current public deployment

- Cloudflare DNS points the subdomain to a VPS
- Nginx routes `/` to the web runtime and `/api` plus `/docs` to the API runtime
- PM2 manages the web and API processes
- PostgreSQL runs on the same VPS

### Netlify

The repository also contains `netlify.toml` for frontend deployment experiments. To make a Netlify frontend usable in practice, `NEXT_PUBLIC_API_URL` must point to a public API instead of `localhost`.

## Documentation Map

- [Documentation Hub](./docs/README.md)
- [Current State](./docs/CURRENT_STATE.md)
- [Quick Start](./QUICKSTART.md)
- [Start Here](./START_HERE.md)
- [API Spec](./docs/API_SPEC.md)
- [DB Schema](./docs/DB_SCHEMA.md)
- [UX Flows](./docs/UX_FLOWS.md)
- [Test Plan](./docs/TEST_PLAN.md)
- [Release Guide](./docs/RELEASE.md)
- [Git Workflow](./docs/GIT_WORKFLOW.md)

## Contributing

Contributions should follow the repository workflow documented in [CONTRIBUTING.md](./CONTRIBUTING.md) and [docs/GIT_WORKFLOW.md](./docs/GIT_WORKFLOW.md).

Repository conventions:

- `main` should remain demoable and deployable
- changes should go through dedicated branches and pull requests
- Conventional Commits are preferred
- documentation should be updated when behavior changes

## Current Scope and Gaps

This repository is already usable for demos and internal workflows, but it is not positioned as a fully production-hardened attendance platform yet.

Known gaps include:

- limited admin CRUD coverage in the web UI
- no end-to-end browser test suite yet
- no background job system for large exports
- offline sync is pragmatic, not a full production sync engine

## Changelog

Project changes are tracked in [CHANGELOG.md](./CHANGELOG.md).
