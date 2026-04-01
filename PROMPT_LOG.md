# PROMPT_LOG

> Ghi lại đầy đủ prompt dùng trong Cursor, kết quả nhận được, phần nào giữ lại, phần nào sửa tay.

---

## Mẫu log

### 2026-04-01 — Init repo scaffold
**Context đã cung cấp cho AI**
- `.cursorrules`
- `README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/TECH_SPEC.md`

**Prompt**
```text
Create a pnpm monorepo with apps/web (Next.js App Router PWA) and apps/api (NestJS + Prisma).
Add docker-compose, .env.example, and a basic folder structure exactly as described in PROJECT_SCAFFOLD.md.
Do not generate business logic yet.
```

**Kết quả**
- Tạo workspace thành công
- Tạo package.json và Dockerfile
- Chưa chuẩn tsconfig path alias

**Review thủ công**
- Sửa lại scripts root
- Sửa Docker healthcheck
- Thêm note về PWA install

**Commit**
```bash
chore: init monorepo scaffold
```

---

### 2026-04-01 — Prisma schema
**Prompt**
```text
Generate Prisma schema for a multi-branch attendance system supporting:
branches, departments, employees, users, geofences, wifi configs, attendance sessions, attendance events, flags, approval requests, audit logs, device registrations.
Use UUIDs, timestamps, soft delete where appropriate, and add indexes for branch_id, employee_id, occurred_at.
```

**Kết quả**
- Tạo schema khá đầy đủ
- Thiếu unique constraints cho employee_code theo tenant
- Thiếu enum approval status

**Review thủ công**
- Thêm composite indexes
- Thêm `@@index([branchId, occurredAt])`
- Tách attendance_session và attendance_event

**Commit**
```bash
feat: add prisma schema for attendance domain
```

---

### 2026-04-02 — Check-in API
**Prompt**
```text
Create NestJS attendance module with:
- POST /attendance/check-in
- POST /attendance/check-out
- server-side geofence validation
- duplicate submission prevention with nonce
- suspicious scoring
Use DTO validation and service/repository separation.
```

**Kết quả**
- Tạo controller/service ok
- Business rules còn chung chung
- Chưa xử lý early checkout

**Review thủ công**
- Bổ sung logic shift-aware
- Thêm AttendanceFlag table write
- Tối ưu transaction

**Commit**
```bash
feat: implement attendance check-in and check-out flow
```

---

## Quy tắc ghi log
- Mỗi feature tối thiểu 1 prompt chính
- Ghi rõ AI tạo gì, sai gì, mình sửa gì
- Log này là deliverable quan trọng, không được bỏ trống
