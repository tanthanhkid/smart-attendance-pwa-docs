# TODO Master Plan

## 0. Foundation
- [ ] Khởi tạo monorepo pnpm workspace
- [ ] Tạo apps/web, apps/api, packages/shared-types
- [ ] Tạo Dockerfiles multi-stage
- [ ] Tạo `docker-compose.yml`
- [ ] Tạo `.env.example`
- [ ] Tạo healthcheck cho postgres / redis / api / web
- [ ] Tạo lint / format / typecheck script
- [ ] Tạo Husky + lint-staged (optional)

## 1. Docs & AI workflow
- [ ] Hoàn thiện `README.md`
- [ ] Hoàn thiện `.cursorrules`
- [ ] Hoàn thiện `PROMPT_LOG.md`
- [ ] Viết `docs/PRODUCT_SPEC.md`
- [ ] Viết `docs/TECH_SPEC.md`
- [ ] Viết `docs/API_SPEC.md`
- [ ] Viết `docs/DB_SCHEMA.md`
- [ ] Viết `docs/SCALING_STRATEGY.md`
- [ ] Viết `docs/TEST_PLAN.md`

## 2. Auth & RBAC
- [ ] Tạo user roles: ADMIN / MANAGER / EMPLOYEE
- [ ] JWT access token
- [ ] refresh token rotation
- [ ] route guard theo role
- [ ] seed tài khoản demo

## 3. Data model
- [ ] Branch
- [ ] BranchGeofence
- [ ] BranchWifiConfig (future-ready)
- [ ] Department
- [ ] Employee
- [ ] User
- [ ] ShiftTemplate
- [ ] ShiftAssignment
- [ ] AttendanceSession
- [ ] AttendanceEvent
- [ ] AttendanceFlag
- [ ] ApprovalRequest
- [ ] AuditLog
- [ ] DeviceRegistration

## 4. Admin features
- [ ] CRUD branch
- [ ] cấu hình geofence
- [ ] cấu hình WiFi placeholder
- [ ] CRUD department
- [ ] gán employee vào branch / department
- [ ] import employee CSV
- [ ] dashboard toàn hệ thống
- [ ] export report

## 5. Manager features
- [ ] dashboard chi nhánh
- [ ] danh sách nhân viên theo trạng thái hôm nay
- [ ] review flagged attendance
- [ ] approve / reject manual requests

## 6. Employee PWA
- [ ] login screen
- [ ] home dashboard
- [ ] check-in flow
- [ ] check-out flow
- [ ] attendance history
- [ ] request correction form
- [ ] install prompt
- [ ] offline shell
- [ ] network reconnect banner

## 7. Attendance core
- [ ] server-side geofence validation
- [ ] distance calculation
- [ ] shift-aware lateness status
- [ ] overtime calculation
- [ ] idempotency key / nonce
- [ ] suspicious scoring
- [ ] duplicate check-in prevention
- [ ] early checkout handling

## 8. Reports
- [ ] daily summary
- [ ] weekly summary
- [ ] monthly summary
- [ ] totals by branch
- [ ] totals by department
- [ ] overtime report
- [ ] late / absent report
- [ ] CSV export
- [ ] async export queue

## 9. Performance & scaling
- [ ] cursor pagination
- [ ] DB indexes
- [ ] Redis cache cho dashboard
- [ ] pre-aggregation jobs
- [ ] rate limit check-in endpoint
- [ ] basic load test with k6

## 10. Security
- [ ] secure cookies / token strategy
- [ ] CORS policy
- [ ] Helmet
- [ ] Zod / class-validator validation
- [ ] audit log for admin actions
- [ ] VPN / proxy heuristic integration
- [ ] suspicious IP logging

## 11. Testing
- [ ] unit tests service layer
- [ ] integration tests API
- [ ] e2e auth
- [ ] e2e attendance flow
- [ ] geofence edge-case tests
- [ ] role permission tests
- [ ] PWA installability check
- [ ] lighthouse audit

## 12. Demo polish
- [ ] seed 100 branches
- [ ] seed 5,000 employees
- [ ] tạo 2–3 tình huống flag gian lận
- [ ] tạo dashboard screenshot assets
- [ ] quay video demo 5–10 phút
