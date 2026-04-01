# API Spec

Tài liệu này mô tả shape và hành vi API theo implementation hiện tại.

Base URL: `/api`

## Auth
### POST /auth/login
Body:
```json
{
  "email": "employee@example.com",
  "password": "password"
}
```

### POST /auth/refresh
Body:
```json
{
  "refreshToken": "..."
}
```

### POST /auth/logout
Body:
```json
{
  "refreshToken": "..."
}
```

---

## Attendance
### POST /attendance/check-in
Body:
```json
{
  "latitude": 10.7712,
  "longitude": 106.6980,
  "accuracy": 18,
  "speed": 0,
  "timestamp": "2026-04-01T08:01:02.000Z",
  "nonce": "uuid",
  "deviceId": "pwa-installation-id"
}
```

Response:
```json
{
  "status": "SUCCESS",
  "sessionId": "uuid",
  "attendanceStatus": "ON_TIME",
  "riskLevel": "LOW",
  "distanceMeters": 23.4,
  "recorded": true,
  "flagged": false,
  "message": "Check-in successful",
  "riskScore": 0,
  "flags": []
}
```

Lưu ý:

- nếu risk cao, API hiện vẫn có thể trả `status: "SUCCESS"`
- khi đó `recorded` có thể là `false`
- `attendanceStatus` có thể là `null`
- `flags` sẽ cho biết lý do cần review

### POST /attendance/check-out
Body tương tự check-in.

### GET /attendance/me/today
Query: none

### GET /attendance/me/history
Query:
- `cursor`
- `limit`
- `from`
- `to`

### POST /attendance/manual-requests
Body:
```json
{
  "attendanceSessionId": "uuid",
  "reason": "Forgot to check out",
  "requestedCheckInAt": "2026-04-01T08:05:00.000Z",
  "requestedCheckOutAt": "2026-04-01T17:10:00.000Z"
}
```

---

## Branches
### GET /branches
Query:
- `cursor`
- `limit`
- `search`
- `status`

### POST /branches
### GET /branches/:id
### PATCH /branches/:id
### DELETE /branches/:id

### PUT /branches/:id/geofence
Body:
```json
{
  "centerLat": 10.7712,
  "centerLng": 106.698,
  "radiusMeters": 120
}
```

### PUT /branches/:id/wifi-config
Body:
```json
{
  "allowedSsids": ["Office-WiFi"],
  "allowedBssids": ["AA:BB:CC:DD:EE:FF"]
}
```
> Future-ready endpoint. Có thể chưa dùng ở PWA browser.

---

## Employees
### GET /employees
Query:
- `cursor`
- `limit`
- `branchId`
- `departmentId`
- `search`
- `status`

### POST /employees
### PATCH /employees/:id
### POST /employees/:id/assign-branch
### POST /employees/:id/assign-department

---

## Dashboard
### GET /dashboard/system-summary
Query:
- `from`
- `to`
- `branchId`
- `departmentId`

### GET /dashboard/branch-summary
### GET /dashboard/trends
### GET /dashboard/heatmap

---

## Reports
### GET /reports/attendance
Query:
- `from`
- `to`
- `branchId`
- `departmentId`
- `employeeId`
- `status`
- `needsReview`
- `recorded`
- `flagged`
- `page`
- `pageSize`

Mỗi item report hiện bao gồm thêm:

- `recorded`
- `flagged`
- `riskScore`

### GET /reports/export
Query:
- `from`
- `to`
- `branchId`
- `departmentId`
- `status`
- `needsReview`
- `recorded`
- `flagged`

Response:
```json
{
  "filename": "attendance_report_2026-04-01_2026-04-30.csv",
  "contentType": "text/csv",
  "totalMatched": 128,
  "exportedCount": 128,
  "truncated": false,
  "limit": 128,
  "downloadUrl": "/api/reports/download?from=2026-04-01&to=2026-04-30&needsReview=true"
}
```

Ghi chú:

- export metadata và download hiện nhận cùng bộ filter với `/reports/attendance`
- implementation hiện tại không còn cắt ngầm export ở 1000 dòng; `truncated` giữ vai trò metadata dự phòng
- `limit` phản ánh số dòng đã export trong response hiện tại

CSV hiện có các cột:

- `date`
- `employee_code`
- `employee_name`
- `branch_code`
- `branch_name`
- `check_in`
- `check_out`
- `total_minutes`
- `overtime_minutes`
- `status`
- `recorded`
- `flagged`
- `risk_score`

### GET /reports/download
Query:
- `from`
- `to`
- `branchId`
- `departmentId`
- `status`
- `needsReview`
- `recorded`
- `flagged`

Response:
- `text/csv` download

---

## Approvals
### GET /approvals
### POST /approvals/:id/approve
### POST /approvals/:id/reject

---

## Audit
### GET /audit-logs
Query:
- `actorId`
- `action`
- `entityType`
- `from`
- `to`
