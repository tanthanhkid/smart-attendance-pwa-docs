# UX Flows

## 1. Employee check-in
1. Mở app
2. Xem card "Hôm nay"
3. Nhấn Check-in
4. App giải thích cần quyền vị trí
5. Trình duyệt hỏi quyền
6. Lấy vị trí
7. Gửi request
8. Hiển thị:
   - đúng giờ / trễ
   - khoảng cách tới chi nhánh
   - trạng thái đáng tin cậy / bị flag

## 2. Employee check-out
1. Mở app
2. Nhấn Check-out
3. Xác thực vị trí
4. Hiển thị tổng giờ làm + overtime

## 3. Manager review
1. Vào danh sách flagged attendance
2. Chọn case
3. Xem vị trí, accuracy, lý do flag
4. Approve / reject

## 4. Admin branch setup
1. Tạo branch
2. Chọn tọa độ tâm
3. Chỉnh radius
4. Lưu geofence
5. Gán manager / nhân viên

## 5. Empty / error states
- mất mạng
- chưa cấp quyền vị trí
- vị trí ngoài geofence
- accuracy kém
- token hết hạn
