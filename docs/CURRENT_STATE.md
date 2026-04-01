# Smart Attendance PWA — Current State

## 1. Mục đích

Smart Attendance PWA là một monorepo local-first cho bài toán chấm công thông minh theo chi nhánh. Hệ thống hiện có:

- frontend PWA bằng Next.js cho employee và dashboard cơ bản cho manager/admin
- backend NestJS REST API
- PostgreSQL qua Prisma
- seed demo để chạy local nhanh

## 2. Cấu trúc repo

```text
apps/
  api/          # NestJS API
  web/          # Next.js PWA
packages/
  shared-types/ # shared types
docs/           # project documentation
scripts/        # local utility scripts
```

## 3. Trạng thái triển khai hiện tại

### Đã có trong codebase

- đăng nhập JWT với role `ADMIN`, `MANAGER`, `EMPLOYEE`
- employee check-in/check-out bằng geolocation
- risk scoring cho check-in/check-out
- lưu `attendance_session`, `attendance_event`, `attendance_flag`
- lịch sử chấm công cá nhân
- gửi yêu cầu chỉnh công
- dashboard tổng quan cho admin/manager
- report attendance ở backend
- export CSV sync qua API
- PWA install prompt, service worker, offline queue cơ bản cho attendance request

### Hành vi quan trọng hiện tại

- check-in rủi ro cao không còn bị chặn ở đầu vào
- hệ thống vẫn nhận request và lưu lại session/event
- nếu risk đủ cao, ca đó sẽ có `status = null`, được hiểu là `chưa ghi nhận`
- manager/admin sẽ thấy được trạng thái này qua dashboard/report thay vì employee bị chặn cứng

### Chưa hoàn thiện hoàn toàn

- frontend admin/manager hiện đã có dashboard, review queue và report UI, nhưng chưa phủ toàn bộ CRUD quản trị
- export hiện là sync CSV, chưa có background export queue
- Redis hiện chưa là dependency bắt buộc cho đường local boot
- một số docs cũ trong repo mang tính định hướng hơn là phản ánh 100% implementation

## 4. Setup local chuẩn

### Yêu cầu

- Node.js tương thích với repo hiện tại
- `pnpm`
- PostgreSQL local đang chạy
- database `smart_attendance`
- user local hiện repo đang dùng mặc định:
  - username: `mtc_admin`
  - password: `mtc_secret_2026`

### Environment

`.env` hiện tại dùng:

```env
DATABASE_URL=postgresql://mtc_admin:mtc_secret_2026@127.0.0.1:5432/smart_attendance?schema=public
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
PORT=4000
```

### Boot local

```bash
pnpm install
pnpm check:db
pnpm db:push
pnpm db:seed
pnpm dev:api
pnpm dev:web
```

### Endpoints local mặc định

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`

## 5. Seed demo

Seed local mặc định hiện tại tạo:

- 5 branches
- 5 manager users
- 50 employee users
- admin demo
- attendance history mẫu cho một phần employee

### Demo accounts

- `admin@smart-attendance.com / admin123`
- `manager1@smart-attendance.com / manager123`
- `employee1@smart-attendance.com / employee123`

## 6. Frontend hiện có

### Màn hình chính đang triển khai

- `/auth/login`
- `/attendance`
- `/history`
- `/dashboard`
- `/dashboard/reviews`
- `/dashboard/reports`

### Ghi chú

- employee được ưu tiên luồng mobile-first
- nếu request attendance không gửi được ngay, frontend có offline queue bằng `sessionStorage`
- install prompt PWA có nút đóng và cooldown 5 ngày trên cùng trình duyệt

## 7. Backend modules hiện có

- `auth`
- `branches`
- `employees`
- `attendance`
- `dashboard`
- `approvals`
- `reports`
- `audit`

## 8. Attendance behavior hiện tại

### Check-in

Request gửi lên gồm:

- `latitude`
- `longitude`
- `accuracy`
- `speed`
- `timestamp`
- `nonce`
- `deviceId`

Server xử lý:

1. kiểm tra duplicate `nonce`
2. lấy employee và geofence branch
3. kiểm tra session hôm nay
4. tính risk score
5. lưu session và event
6. nếu rủi ro cao:
   - không chặn request
   - vẫn lưu `checkInAt`
   - đặt `status = null`
   - giữ `flags` và `riskScore`

### Ngưỡng risk hiện tại

- ngoài `radius`: `+50`
- ngoài `radius * 2`: `+100`
- `accuracy > 100m`: `+25`
- `speed > 50 m/s`: `+40`
- `score >= 20`: `ALLOW_WITH_FLAG`
- `score >= 50`: không ghi nhận vào công, nhưng vẫn lưu để manager review

## 9. Report và dashboard

### Report backend

`GET /reports/attendance` và CSV export hiện đã có:

- `status`
- `recorded`
- `flagged`
- `risk_score`

### Dashboard

Dashboard hiện phản ánh:

- tổng sessions
- sessions bị cờ
- sessions đã ghi nhận
- sessions chưa ghi nhận
- sessions cần review
- late count

### Manager review queue

Manager/Admin hiện có thể:

- xem danh sách session bị cờ hoặc chưa ghi nhận
- xem risk score, accuracy, khoảng cách so với chi nhánh
- mở sang report để rà soát sâu hơn
- ghi nhận thủ công một attendance session chưa được record

## 10. Database model thực tế

Các model chính hiện có trong Prisma schema:

- `User`
- `Employee`
- `Branch`
- `BranchGeofence`
- `BranchWifiConfig`
- `Department`
- `ShiftTemplate`
- `AttendanceSession`
- `AttendanceEvent`
- `AttendanceFlag`
- `ApprovalRequest`
- `DeviceRegistration`
- `AuditLog`

## 11. Test hiện có

Backend hiện đã có test cho:

- reports CSV/export behavior
- seed helpers
- manager branch scoping
- manual correction flow
- attendance risk/session behavior

Frontend hiện có test utility cơ bản.

## 12. Known gaps

- approvals hiện vẫn chưa có full management UI tách biệt ngoài khu vực review queue
- chưa có e2e browser test
- chưa có queue/background jobs thật cho export lớn
- offline queue hiện mới ở mức pragmatic local UX, chưa phải sync engine production-grade
- tài liệu OpenAPI trong `docs/openapi.yaml` chưa phải spec đầy đủ được generate từ code

## 13. Đề xuất đọc tiếp

- [`API_SPEC.md`](./API_SPEC.md)
- [`DB_SCHEMA.md`](./DB_SCHEMA.md)
- [`UX_FLOWS.md`](./UX_FLOWS.md)
- [`TEST_PLAN.md`](./TEST_PLAN.md)
