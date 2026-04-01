# Project Scaffold

```text
smart-attendance-pwa/
├─ .cursorrules
├─ .env.example
├─ .gitignore
├─ docker-compose.yml
├─ package.json
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ README.md
├─ TODO.md
├─ PROMPT_LOG.md
├─ PROJECT_SCAFFOLD.md
├─ docs/
│  ├─ PRODUCT_SPEC.md
│  ├─ TECH_SPEC.md
│  ├─ API_SPEC.md
│  ├─ DB_SCHEMA.md
│  ├─ UX_FLOWS.md
│  ├─ SCALING_STRATEGY.md
│  ├─ TEST_PLAN.md
│  └─ GIT_WORKFLOW.md
├─ apps/
│  ├─ web/
│  │  ├─ Dockerfile
│  │  ├─ package.json
│  │  ├─ next.config.mjs
│  │  ├─ tsconfig.json
│  │  ├─ public/
│  │  │  ├─ icons/
│  │  │  └─ manifest.webmanifest
│  │  ├─ src/
│  │  │  ├─ app/
│  │  │  │  ├─ (employee)/
│  │  │  │  │  ├─ page.tsx
│  │  │  │  │  ├─ attendance/
│  │  │  │  │  ├─ history/
│  │  │  │  │  └─ requests/
│  │  │  │  ├─ (admin)/
│  │  │  │  │  ├─ dashboard/
│  │  │  │  │  ├─ branches/
│  │  │  │  │  ├─ employees/
│  │  │  │  │  └─ reports/
│  │  │  │  ├─ auth/login/
│  │  │  │  ├─ install/
│  │  │  │  └─ layout.tsx
│  │  │  ├─ components/
│  │  │  │  ├─ attendance/
│  │  │  │  ├─ dashboard/
│  │  │  │  ├─ forms/
│  │  │  │  └─ ui/
│  │  │  ├─ lib/
│  │  │  │  ├─ api-client.ts
│  │  │  │  ├─ auth.ts
│  │  │  │  ├─ geolocation.ts
│  │  │  │  ├─ pwa.ts
│  │  │  │  └─ validators.ts
│  │  │  └─ styles/
│  │  └─ README.md
│  └─ api/
│     ├─ Dockerfile
│     ├─ package.json
│     ├─ tsconfig.json
│     ├─ nest-cli.json
│     ├─ prisma/
│     │  ├─ schema.prisma
│     │  └─ seed.ts
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ app.module.ts
│     │  ├─ common/
│     │  │  ├─ guards/
│     │  │  ├─ interceptors/
│     │  │  ├─ decorators/
│     │  │  ├─ filters/
│     │  │  └─ utils/
│     │  ├─ modules/
│     │  │  ├─ auth/
│     │  │  ├─ users/
│     │  │  ├─ branches/
│     │  │  ├─ employees/
│     │  │  ├─ attendance/
│     │  │  ├─ reports/
│     │  │  ├─ dashboard/
│     │  │  ├─ approvals/
│     │  │  └─ audit/
│     │  └─ config/
│     └─ README.md
└─ packages/
   └─ shared-types/
      ├─ package.json
      ├─ tsconfig.json
      └─ src/
         ├─ enums.ts
         ├─ attendance.ts
         ├─ branch.ts
         └─ user.ts
```

## Nguyên tắc tổ chức
- `apps/web`: toàn bộ UI/PWA
- `apps/api`: toàn bộ API và business logic
- `packages/shared-types`: dùng chung enum, DTO contract, constants
- `docs`: nơi Cursor phải đọc trước khi generate code

## Module ưu tiên sinh trước
1. auth
2. branch CRUD
3. employee assignment
4. attendance check-in/check-out
5. history & reports
6. dashboard
