# UX Flows

## 1. Employee check-in

1. Mở app
2. Xem card "Hôm nay"
3. Nhấn `Check-in`
4. App xin quyền vị trí đúng lúc user action
5. Lấy geolocation
6. Gửi request tới API
7. Hiển thị một trong các trạng thái:
   - check-in thành công và đã được ghi nhận
   - check-in thành công nhưng bị cờ
   - check-in đã gửi nhưng chưa được ghi nhận vì risk cao
   - check-in được xếp hàng nếu mất mạng hoặc API chưa phản hồi

## 2. Employee check-out

1. Mở app
2. Nhấn `Check-out`
3. App lấy vị trí
4. API cập nhật session đang mở
5. UI hiển thị tổng thời gian làm việc

## 3. Employee history

1. Vào `Lịch sử chấm công`
2. Xem session theo ngày
3. Nếu session có cờ, UI hiển thị cảnh báo
4. Nếu session `status = null`, UI hiển thị `Chưa ghi nhận`

## 4. Manager/Admin overview

1. Vào dashboard
2. Xem tổng quan số lượt:
   - đã ghi nhận
   - chưa ghi nhận
   - bị cờ
   - trễ
3. Từ report/backend có thể drill deeper bằng `recorded`, `flagged`, `riskScore`

Ghi chú:

- UI manager/admin hiện mới có dashboard cơ bản
- backend đã có thêm endpoint report/approval beyond current UI

## 5. Admin branch setup

1. Tạo branch
2. Chọn tọa độ tâm
3. Chỉnh radius geofence
4. Lưu branch/geofence
5. Gán manager hoặc employee qua backend flow

## 6. Empty và error states

- mất mạng
- chưa cấp quyền vị trí
- API chưa chạy
- vị trí ngoài geofence nhưng vẫn được lưu ở trạng thái flagged/unrecorded
- accuracy kém
- token hết hạn
- dashboard không tải được dữ liệu

## 7. PWA behavior

- install prompt có thể đóng
- sau khi bấm `Đóng`, prompt bị ẩn 5 ngày trên cùng trình duyệt
- app có service worker và offline queue cho attendance request
