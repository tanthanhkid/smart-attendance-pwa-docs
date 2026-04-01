# Git Workflow

## Branch strategy

- `main`: branch ổn định, ưu tiên trạng thái chạy được và demo được
- `feature/*`: phát triển tính năng
- `fix/*`: sửa lỗi
- `docs/*`: cập nhật tài liệu
- `refactor/*`: chỉnh cấu trúc nhưng không đổi behavior chính
- `release/*`: dùng khi cần chốt bản demo/release
- `hotfix/*`: sửa lỗi gấp trên nhánh ổn định

`develop` có thể dùng nếu team cần integration branch, nhưng không bắt buộc cho workflow hiện tại của repo.

## PR rule
- mỗi feature = 1 branch
- code AI sinh ra phải review 100%
- PR description phải ghi:
  - mục tiêu
  - thay đổi chính
  - test đã chạy
  - rủi ro còn lại

## Conventional commits
- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `ci`
- `perf`

## Ví dụ branch
- feature/init-monorepo
- feature/auth-rbac
- feature/branch-geofence-crud
- feature/attendance-checkin-flow
- feature/reports-export

## Ví dụ commit

- `feat: allow high-risk check-in with manager review`
- `fix: restore local postgres credentials for api boot`
- `docs: refresh current-state documentation`

## Merge rule

- ưu tiên squash merge hoặc rebase merge để lịch sử gọn
- không merge PR khi chưa hiểu rõ behavior chính bị ảnh hưởng
- thay đổi nghiệp vụ phải đi cùng docs update nếu cần
- release PR nên đi qua [docs/RELEASE.md](./RELEASE.md) trước khi tag

## Minimum verification before merge

- `pnpm typecheck`
- `pnpm test`

Hoặc ít nhất chạy scope liên quan trực tiếp tới phần được sửa.

## Tags and Releases

- tạo tag theo `vMAJOR.MINOR.PATCH`
- changelog phải phản ánh đúng release tag
- nếu release có deploy web, lưu URL preview/production trong PR hoặc release note
