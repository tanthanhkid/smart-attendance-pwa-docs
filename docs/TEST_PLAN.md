# Test Plan

## 1. Backend tests hiện có

Repo hiện đã có automated tests cho:

- attendance session behavior
- high-risk check-in nhưng không ghi nhận
- duplicate nonce handling
- reports CSV/export behavior
- seed helper behavior
- manager branch scoping
- manual correction flow

## 2. Frontend tests hiện có

- utility-level tests cơ bản cho web

Chưa có frontend integration test hoặc browser e2e hoàn chỉnh.

## 3. Manual QA nên chạy

- employee login
- check-in thành công trong geofence
- check-in ngoài geofence nhưng vẫn được lưu flagged/unrecorded
- check-out thành công
- history hiển thị warning đúng
- dashboard manager/admin phản ánh `flagged` và `unrecorded`
- PWA install prompt đóng xong không hiện lại trong 5 ngày
- offline queue cho attendance request

## 4. E2E flow mục tiêu

- employee login -> check-in -> history
- employee check-in high-risk -> manager sees unrecorded case
- employee request manual correction -> manager review
- admin create branch -> assign employee -> check-in

## 5. Performance / scale checks

- seed lớn hơn demo data
- simulate burst check-in
- inspect API p95 cho attendance/report
- đánh giá pagination và export cap

## 6. Ghi chú

- current repo ưu tiên local-first correctness hơn performance benchmarking đầy đủ
- chưa có browser automation pipeline production-grade trong codebase hiện tại
