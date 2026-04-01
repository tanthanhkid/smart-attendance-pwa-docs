# Database Schema Notes

## Các entity chính
- users
- employees
- branches
- departments
- shift_templates
- shift_assignments
- branch_geofences
- branch_wifi_configs
- attendance_sessions
- attendance_events
- attendance_flags
- approval_requests
- device_registrations
- audit_logs

## Thiết kế quan trọng
### 1. Tách attendance_session và attendance_event
- `attendance_sessions`: record tổng hợp theo ca/ngày
- `attendance_events`: event sourcing nhẹ cho check-in/check-out/retry/reject

### 2. Multi-branch ready
- employee gắn branch hiện tại
- manager có thể map một hoặc nhiều branch
- mọi query quan trọng có `branch_id`

### 3. Scale-friendly indexes
- `attendance_sessions(branch_id, work_date)`
- `attendance_sessions(employee_id, work_date desc)`
- `attendance_events(branch_id, occurred_at desc)`
- `employees(branch_id, department_id)`
- `approval_requests(branch_id, status, created_at desc)`

### 4. Future-ready WiFi
Dù PWA browser chưa dùng trực tiếp, vẫn giữ bảng:
- `branch_wifi_configs`
- cho phép lưu allowed ssid / bssid
- có thể bật sau nếu làm native wrapper

## Soft delete
Áp dụng cho:
- branches
- departments
- employees
- users (optional)

## Data retention
- attendance_events: giữ dài hạn cho audit
- audit_logs: giữ theo chính sách 12–24 tháng
