# Technical Spec

## 1. Tech stack
### Frontend
- Next.js App Router
- TypeScript
- Tailwind CSS
- custom service worker / PWA setup
- TanStack Query
- React Hook Form + Zod

### Backend
- NestJS
- Prisma
- PostgreSQL
- Redis (optional / future-oriented in current local path)
- BullMQ (chưa dùng ở implementation hiện tại)
- Swagger OpenAPI

## 2. Frontend architecture
- route groups cho employee và admin
- API client typed
- auth store nhẹ
- feature-based components
- install prompt manager
- offline shell
- retry UX khi mất mạng
- employee-first attendance screens đã có
- manager/admin UI hiện mới ở mức dashboard cơ bản

## 3. Backend architecture
- feature modules
- DTO + validation
- service layer
- centralized config
- audit logging

## 4. Attendance algorithm
### Check-in
1. Client lấy geolocation
2. Client gửi latitude, longitude, accuracy, speed, timestamp, nonce
3. Server lấy branch geofence tương ứng
4. Tính khoảng cách tới tâm geofence
5. Tính risk score
6. Luôn lưu attendance session + event nếu request hợp lệ
7. Nếu risk cao -> session được lưu nhưng `status = null` để manager review
8. Nếu risk trung bình -> allow with flag

### Check-out
1. Kiểm tra ca mở
2. Lấy vị trí hiện tại
3. Validate geofence/risk
4. Ghi check-out event
5. Tính tổng giờ làm và overtime

## 5. Risk scoring gợi ý
- outside_geofence = +100
- poor_accuracy = +25
- vpn_or_proxy = +20
- new_device = +10
- impossible_speed = +40
- repeated_failures = +15
- time_skew = +20

### Policy hiện tại
- 0–19: allow
- 20–49: allow_with_flag
- >= 50: session chưa ghi nhận, cần manager review

## 6. PWA notes
- installable manifest
- service worker cache static shell
- geolocation only in secure context
- defer permission request tới đúng user action
- không hứa đọc WiFi SSID/BSSID trên browser
- install prompt có cooldown 5 ngày khi user bấm đóng

## 7. Observability
- request logging
- attendance decision logging
- audit trail for admin writes
- simple metrics: success rate, reject rate, flagged rate

## 8. Non-functional requirements
- role-based access control
- pagination for large lists
- seedable demo data
- local-first setup với PostgreSQL local
- code review for all AI-generated code

## 9. Current implementation notes
- Export report hiện là sync CSV, chưa phải background export queue.
- Seed local hiện ưu tiên boot nhanh; scale target và scale demo là hai chuyện khác nhau.
- Local PostgreSQL credential mặc định hiện project đang dùng là `mtc_admin`.
