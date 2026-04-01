# Product Spec — Smart Attendance PWA

## 1. Mục tiêu
Xây dựng hệ thống chấm công thông minh cho doanh nghiệp đa chi nhánh, quy mô 100 chi nhánh và 5.000 nhân viên.

Seed demo hiện tại là bộ nhỏ để chạy nhanh local: 5 branches, 5 managers, 50 employees. Con số 100 / 5.000 là mục tiêu sản phẩm, không phải dữ liệu seed mặc định.

## 2. Personas
### Employee
- muốn check-in/check-out nhanh trên mobile
- muốn xem lịch sử công cá nhân
- muốn gửi yêu cầu chỉnh công

### Manager
- quản lý một hoặc nhiều chi nhánh
- muốn thấy trạng thái đi làm hôm nay
- muốn duyệt ca bất thường / yêu cầu chỉnh công

### Admin
- quản trị toàn hệ thống
- cấu hình chi nhánh, geofence, người dùng, báo cáo

## 3. User stories cốt lõi
### Employee
- Là nhân viên, tôi muốn mở app trên điện thoại và check-in trong vài giây
- Là nhân viên, tôi muốn xem mình đi trễ hay đúng giờ
- Là nhân viên, tôi muốn check-out cuối ca và xem tổng giờ làm
- Là nhân viên, tôi muốn gửi yêu cầu chỉnh công khi bị sai

### Manager
- Là quản lý, tôi muốn xem ai đã check-in trong chi nhánh hôm nay
- Là quản lý, tôi muốn duyệt những ca bị flag nghi ngờ
- Là quản lý, tôi muốn xem thống kê theo phòng ban

### Admin
- Là admin, tôi muốn tạo/sửa/xóa chi nhánh
- Là admin, tôi muốn cấu hình geofence cho từng địa điểm
- Là admin, tôi muốn xuất báo cáo tháng toàn hệ thống

## 4. Scope MVP
### In scope
- Auth + RBAC
- Branch CRUD
- Employee assignment
- GPS geofencing check-in/out
- Attendance history
- Daily/weekly/monthly report
- Dashboard
- Approval flow
- Local-first run with PostgreSQL on localhost
- Prompt log + Cursor context

### Out of scope for MVP
- Payroll integration
- Face recognition
- BLE beacon production integration
- Native SSID/BSSID reading in browser PWA
- Multi-tenant SaaS billing

## 5. Success metrics
- Check-in flow hoàn thành < 10 giây
- Dashboard branch load < 2 giây ở data demo
- API list có pagination/filter
- Một lệnh local start script chạy được toàn bộ app khi PostgreSQL local đã sẵn sàng
- Có prompt log và git flow rõ ràng

## 6. Current implementation notes
- GPS geofencing là cơ chế kiểm soát vị trí chính.
- WiFi verification là hướng mở rộng, không phải giả định PWA browser đã đọc được SSID/BSSID.
- Report export hiện chạy sync theo request; có metadata endpoint và download endpoint riêng, chưa phải background export queue production.

## 7. Differentiators
- Mobile-first PWA
- Risk-scored anti-fraud
- Review queue cho ca bất thường
- Scale-ready schema
- Honest platform-aware design
