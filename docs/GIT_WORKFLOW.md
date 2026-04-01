# Git Workflow

## Branches
- `main`: production-ready
- `develop`: integration branch
- `feature/*`: từng tính năng
- `release/*`: chuẩn bị nộp bài / demo
- `hotfix/*`: sửa lỗi gấp

## PR rule
- mỗi feature = 1 branch
- code AI sinh ra phải review 100%
- PR description phải ghi:
  - mục tiêu
  - thay đổi chính
  - test đã chạy
  - rủi ro còn lại

## Conventional commits
- feat
- fix
- docs
- refactor
- test
- chore
- ci

## Ví dụ branch
- feature/init-monorepo
- feature/auth-rbac
- feature/branch-geofence-crud
- feature/attendance-checkin-flow
- feature/reports-export
