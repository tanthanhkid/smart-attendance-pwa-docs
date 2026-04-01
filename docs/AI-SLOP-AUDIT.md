# AI Slop Audit

Audit date: 2026-04-01

Scope:

- `apps/api`
- `apps/web`
- workspace scripts/docs for local start

Status legend:

- `[!]` Found and fixed in this session
- `[x]` Verified good
- `[-]` Still a known follow-up

## Findings Fixed

- `[!]` Root workspace verification was not trustworthy from one command.
  Fix: root `package.json` now runs `typecheck`, `lint`, `build`, `test`, and `format` sequentially per app instead of relying on recursive workspace execution with unstable behavior on Windows.

- `[!]` Test status was previously AI-slop territory.
  Fix: `apps/api` and `apps/web` now have real executable test commands with assertions in `apps/api/test/*.test.ts` and `apps/web/test/utils.test.ts` instead of placeholder green output.

- `[!]` Manager RBAC scope was incomplete on employee data.
  Fix: `apps/api/src/modules/employees/employees.controller.ts` and `apps/api/src/modules/employees/employees.service.ts` now force manager requests onto the manager’s own branch and reject cross-branch direct access.

- `[!]` Manager RBAC scope was incomplete on approval flows.
  Fix: `apps/api/src/modules/approvals/approvals.controller.ts` and `apps/api/src/modules/approvals/approvals.service.ts` now constrain list/detail/approve/reject actions to the manager’s own branch.

- `[!]` Report export contract was half-implemented and docs drifted away from reality.
  Fix: `apps/api/src/modules/reports/reports.controller.ts` now exposes honest export metadata plus a real `GET /api/reports/download` CSV endpoint. `docs/API_SPEC.md` and `README.md` were updated to match the sync export flow.

- `[!]` Offline attendance queue still had a hidden stuck-state path.
  Fix: `apps/web/src/lib/api-client.ts` now emits queue lifecycle events, handles non-JSON/204 responses correctly, and `apps/web/src/app/attendance/page.tsx` now clears pending state when queued sync fails permanently.

- `[!]` Seed-config honesty and docs were out of sync.
  Fix: current seed implementation uses `SEED_BRANCH_COUNT` and `SEED_EMPLOYEE_COUNT`, and the audit/docs now distinguish scale target from local/demo seed behavior.

- `[!]` Repo hygiene still carried generated residue.
  Fix: stale root log files were removed, `apps/api/package-lock.json` is gone from the pnpm workspace, and `.gitignore` now also ignores `*.tsbuildinfo`.

## Verified State

- `[x]` `pnpm install` passes
- `[x]` `pnpm typecheck` passes
- `[x]` `pnpm lint` passes
- `[x]` `pnpm test` passes
- `[x]` `pnpm build` passes
- `[x]` `pnpm --filter @smart-attendance/api db:push` passes
- `[x]` `pnpm --filter @smart-attendance/api db:seed` passes
- `[x]` current workspace `.env` used for verification seeded `100` branches and `5000` employees on 2026-04-01
- `[x]` `http://localhost:4000/docs` responds locally
- `[x]` `GET /api/reports/export` returns export metadata with `downloadUrl`
- `[x]` `GET /api/reports/download` returns real CSV content
- `[x]` manager employee queries are forced back onto the manager’s own branch even when another `branchId` is supplied
- `[x]` web app from this repo was started locally on `http://localhost:3002` because `localhost:3000` was already occupied by another unrelated process on this machine

## Remaining Follow-up

- `[-]` Logout is still mostly on-paper.
  `apps/api/src/modules/auth/auth.service.ts` returns success for logout but does not invalidate refresh tokens server-side.

- `[-]` API TypeScript safety is still relaxed.
  `apps/api/tsconfig.json` still has `strict: false` and `noUncheckedIndexedAccess: false`, which is a real repo-quality gap even though current builds pass.

- `[-]` Automated tests now exist, but coverage is still light.
  Current tests prove the test stack is real and cover key regressions around reports/seed/utils, but they are not feature-complete integration coverage.

- `[-]` `docs/openapi.yaml` is still a stub, not a faithful export of the live API surface.
