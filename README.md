# Smart Attendance PWA

Repo monorepo cho bài thực hành **Smart Attendance - Chấm công thông minh**. Đây là một PWA web trước hết chạy local, có backend NestJS và frontend Next.js, phục vụ demo employee / manager / admin.

## Trạng thái thật của repo

- Local-first là luồng khởi động chính.
- PostgreSQL local chạy ở `localhost:5432`.
- Docker vẫn có trong repo như một lựa chọn phụ, nhưng không phải đường boot mặc định.
- Seed demo hiện tại tạo `5` branches, `5` managers, `50` employees.
- Report listing đang hoạt động; export CSV hiện có metadata endpoint và download endpoint sync.

## Kiến trúc

```text
apps/
  web/          # Next.js PWA: employee app + admin console
  api/          # NestJS REST API
packages/
  shared-types/ # shared DTOs, enums, validation contracts
docs/           # specs, flows, API, DB, scale, test plan
```

## Mục tiêu sản phẩm

- Check-in / check-out qua GPS geofencing
- Hỗ trợ employee, manager, admin
- Dashboard và report
- RBAC rõ ràng
- Honest về giới hạn của PWA browser

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm check:db
pnpm --filter @smart-attendance/api db:push
pnpm --filter @smart-attendance/api db:seed
pnpm dev:api
pnpm dev:web
```

`pnpm check:db` reads `DATABASE_URL` from `.env` and verifies your standalone local PostgreSQL is reachable before boot.

### Services

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`

## Demo data

- Admin demo: `admin@smart-attendance.com / admin123`
- Manager demo: `manager1@smart-attendance.com / manager123`
- Employee demo: `employee1@smart-attendance.com / employee123`

Seed hiện tại là bộ demo nhỏ để boot nhanh và kiểm chứng flow, không phải tải dữ liệu 100 chi nhánh / 5.000 nhân viên.

## Lưu ý về export

CSV export hiện là luồng sync:

- `GET /reports/export` trả metadata trung thực về `totalMatched`, `exportedCount`, `truncated`, `limit`
- `GET /reports/download` trả file CSV thật

Repo này chưa có async export queue production. Đừng diễn giải flow hiện tại như một pipeline background hoàn chỉnh.

## Tài liệu liên quan

- [Quick Start](./QUICKSTART.md)
- [Start Here](./START_HERE.md)
- [Product Spec](./docs/PRODUCT_SPEC.md)
- [Scaling Strategy](./docs/SCALING_STRATEGY.md)
- [AI Slop Checklist](./docs/AI-SLOP-CHECKLIST.md)
