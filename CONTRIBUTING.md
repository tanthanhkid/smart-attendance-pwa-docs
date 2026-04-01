# Contributing

## Mục tiêu

Tài liệu này định nghĩa cách đóng góp vào repo để giữ:

- branch sạch
- commit dễ đọc
- PR dễ review
- docs và code không bị lệch nhau

## Working Model

### Branch policy

- `main`: branch ổn định, luôn ưu tiên trạng thái chạy được
- không commit trực tiếp lên `main` nếu đang làm thay đổi đáng kể
- tạo branch riêng cho từng task hoặc nhóm thay đổi liên quan

### Branch naming

Khuyến nghị:

- `feature/<short-name>`
- `fix/<short-name>`
- `docs/<short-name>`
- `refactor/<short-name>`
- `chore/<short-name>`

Ví dụ:

- `feature/attendance-risk-review`
- `fix/pwa-install-prompt-cooldown`
- `docs/project-documentation-refresh`

## Commit Convention

Repo dùng Conventional Commits:

- `feat:`
- `fix:`
- `docs:`
- `refactor:`
- `test:`
- `chore:`
- `ci:`

Ví dụ:

- `feat: allow high-risk check-in with manager review`
- `fix: prevent install prompt from reappearing during cooldown`
- `docs: refresh project documentation for current state`

## Before Opening a PR

Chạy tối thiểu những thứ liên quan đến phần bạn sửa:

```bash
pnpm typecheck
pnpm test
```

Nếu thay đổi chỉ ở một app, có thể chạy scope hẹp hơn:

```bash
pnpm --filter @smart-attendance/api test
pnpm --filter @smart-attendance/web typecheck
```

Nếu đang chốt bản release, làm theo [docs/RELEASE.md](./docs/RELEASE.md) để giữ branch, tag và verify nhất quán.

## PR Checklist

PR nên có:

- mục tiêu thay đổi
- phạm vi ảnh hưởng
- cách verify
- test đã chạy
- known gaps hoặc rủi ro còn lại

Mẫu ngắn:

```md
## Summary
- ...

## Verification
- ...

## Risks
- ...
```

## Documentation Rule

Nếu thay đổi ảnh hưởng tới:

- setup local
- API shape
- behavior nghiệp vụ
- workflow làm việc

thì phải cập nhật docs tương ứng trong:

- `README.md`
- `docs/CURRENT_STATE.md`
- `docs/API_SPEC.md`
- `docs/DB_SCHEMA.md`
- `docs/UX_FLOWS.md`
- `docs/GIT_WORKFLOW.md`

## AI-generated Code Rule

- AI-generated code không được merge kiểu “tin mù”
- reviewer phải đọc phần logic chính, đặc biệt ở auth, attendance, report, data model
- nếu behavior thực tế thay đổi, cập nhật docs ngay trong cùng thay đổi đó
