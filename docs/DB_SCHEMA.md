# Database Schema Notes

Tài liệu này phản ánh Prisma schema hiện tại trong `apps/api/prisma/schema.prisma`.

## Các entity chính hiện có

- `User`
- `Employee`
- `Branch`
- `Department`
- `ShiftTemplate`
- `BranchGeofence`
- `BranchWifiConfig`
- `AttendanceSession`
- `AttendanceEvent`
- `AttendanceFlag`
- `ApprovalRequest`
- `DeviceRegistration`
- `AuditLog`

## Thiết kế quan trọng
### 1. Tách attendance_session và attendance_event
- `attendance_sessions`: record tổng hợp theo ca/ngày
- `attendance_events`: event sourcing nhẹ cho check-in/check-out/reject

### 2. Multi-branch ready
- employee gắn branch hiện tại
- manager hiện được scope theo branch của employee record
- mọi query attendance/report quan trọng có `branchId`

### 3. Scale-friendly indexes
- `attendance_sessions(branch_id, work_date)`
- `attendance_sessions(employee_id, work_date desc)`
- `attendance_events(branch_id, occurred_at desc)`
- `employees(branch_id, department_id)`
- `approval_requests(branch_id, status, created_at desc)`

### 4. Trạng thái chấm công rủi ro cao

- `AttendanceSession.status = null` được dùng cho case đã gửi check-in nhưng chưa được ghi nhận
- `AttendanceSession.isFlagged` cho biết session có cờ rủi ro
- `AttendanceSession.riskScore` lưu điểm risk tổng hợp
- `AttendanceFlag` lưu lý do cụ thể để manager/admin review

### 5. Geofence

- `BranchGeofence` lưu tâm và bán kính cho từng branch
- `AttendanceEvent.distanceMeters` lưu khoảng cách thực tế tại thời điểm gửi event

### 6. Future-ready WiFi
Dù PWA browser chưa dùng trực tiếp, vẫn giữ bảng:
- `BranchWifiConfig`
- cho phép lưu SSID/BSSID theo hướng mở rộng
- có thể bật sau nếu làm native wrapper

## Ghi chú implementation

- `Department` hiện không có soft delete field
- `ShiftAssignment` chưa tồn tại trong schema hiện tại
- `Branch` và `Employee` dùng `isActive` thay cho soft delete đầy đủ

## Data retention
- attendance_events: giữ dài hạn cho audit
- audit_logs: giữ theo chính sách 12–24 tháng
