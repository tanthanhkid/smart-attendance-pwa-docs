# AI Slop Checklist

Checklist này dùng để audit project AI-generated theo trạng thái thực thi thật, không dùng PASS giả định. Kết quả verified của repo hiện tại nằm ở [AI-SLOP-AUDIT.md](./AI-SLOP-AUDIT.md).

## 1. Runtime Honesty

- [ ] `lint`, `typecheck`, `build`, `test` đều chạy code thật, không phải script in ra thông báo xanh rồi exit 0
- [ ] zero-test state không được ngụy trang là green nếu chưa có test stack thật
- [ ] quickstart/start script phản ánh đúng luồng chạy hiện tại
- [ ] docs không claim verified success khi chưa có verify thực tế
- [ ] route hiển thị trong UI phải tồn tại thật
- [ ] README/QUICKSTART/START_HERE nói cùng một câu chuyện

## 2. Local Environment

- [ ] app đọc đúng `.env` trong monorepo khi chạy qua `pnpm --filter`
- [ ] `.env.example` dùng default phù hợp cho local, không trỏ nhầm host Docker
- [ ] local start không phụ thuộc Docker nếu project nói hỗ trợ local
- [ ] database bootstrap (`db:push`, `db:seed`) chạy được từ root workspace
- [ ] local start không yêu cầu Redis nếu Redis chưa được khai báo là bắt buộc

## 3. Auth And RBAC

- [ ] endpoint employee-only không chấp nhận user không có `employeeId`
- [ ] manager-only view bị scope theo chi nhánh của manager
- [ ] manager không thể query dữ liệu branch khác chỉ bằng query param
- [ ] admin-only endpoint không bị manager/employee chạm vào qua client-side cast
- [ ] token auth được gắn tự động ở frontend request client
- [ ] refresh/logout flow không chỉ tồn tại trên giấy

## 4. DTO And Contracts

- [ ] DTO có validator thực tế cho body/query quan trọng
- [ ] query pagination được clamp, không nhận page size vô hạn
- [ ] date range input được parse và kiểm tra hợp lệ
- [ ] response type ở frontend không dựa vào cast rải rác trong page
- [ ] error message trả ra nhất quán và hữu dụng

## 5. Data Integrity

- [ ] multi-step write dùng transaction khi cần
- [ ] audit log ghi đúng actor id, không nhầm user id với employee id
- [ ] business metadata quan trọng không bị nhận vào rồi bỏ qua
- [ ] approval/review flow ghi nhận đúng reviewer và trạng thái cuối
- [ ] report/export không âm thầm cắt dữ liệu mà không báo

## 6. Query Correctness

- [ ] metric dashboard bám đúng filter branch/department
- [ ] pagination metadata phản ánh đúng tập item trả về
- [ ] query list/report có giới hạn hợp lý
- [ ] không có N+1 query rõ ràng ở dashboard/report/history
- [ ] thống kê demo không được trình bày như load test production

## 7. Reporting And Export

- [ ] export API có contract thật, không trả `downloadUrl` giả
- [ ] download endpoint nếu có thì phải tồn tại và phục vụ file thật
- [ ] nếu export còn sync thì docs phải nói sync, không gọi nhầm là async queue
- [ ] nếu export bị cap thì response phải khai báo rõ cap và truncation

## 8. Frontend Runtime

- [ ] dashboard fetch đúng endpoint theo role thực tế
- [ ] offline queue không tạo UX mâu thuẫn kiểu `queued` nhưng báo fail
- [ ] state pending/queued được xóa khi server phản ánh kết quả thật
- [ ] home/login/navigation dùng route hygiene đúng
- [ ] non-employee không đi vào luồng employee page

## 9. Seed And Demo Data

- [ ] demo data, README, quickstart và seed script nói cùng một câu chuyện
- [ ] seed scale/config là thật, không phải con số marketing
- [ ] env vars trong `.env.example` phải được seed/script dùng thật nếu docs nói là config
- [ ] seeded demo không được dùng làm bằng chứng cho scale target

## 10. Repo Hygiene

- [ ] generated logs/build artifacts không bị xem như source of truth
- [ ] committed docs không chứa advice hạ chuẩn kiểu `tắt strict để chạy`
- [ ] TypeScript compiler flags (`strict`, `noUncheckedIndexedAccess`, ...) không bị nới lỏng mà không có lý do rõ ràng
- [ ] package manager usage nhất quán trong monorepo
- [ ] npm lockfile không còn tồn tại trong pnpm-only workspace
- [ ] generated outputs không bị commit nếu không phải artifact cần thiết

## 11. Verification Pass

Sau mỗi đợt fix:

- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm build`
- [ ] `pnpm --filter @smart-attendance/api db:push`
- [ ] `pnpm --filter @smart-attendance/api db:seed`
- [ ] start local API
- [ ] start local web
- [ ] smoke test `http://localhost:3000`
- [ ] smoke test `http://localhost:4000/docs`
- [ ] check test scripts against real assertions, not placeholder green output
