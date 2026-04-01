# Changelog

All notable changes to this project will be documented in this file.

The format is inspired by Keep a Changelog.

## [Unreleased]

### Added

- documentation hub trong `docs/README.md`
- `docs/CURRENT_STATE.md` làm nguồn mô tả implementation hiện tại
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- manager report UI hiển thị tọa độ check-in/check-out và mở trực tiếp vị trí chấm công trên Google Maps
- màn hình admin settings để cấu hình geofence chi nhánh và gán nhân viên cho quản lý

### Changed

- hoàn thiện README để phản ánh đúng local-first workflow
- cập nhật docs API, DB, UX, test plan và technical notes
- check-in risk cao không bị chặn cứng, thay vào đó được lưu để manager review
- dashboard/report phản ánh sessions đã ghi nhận và chưa ghi nhận
- PWA install prompt có cooldown khi user bấm đóng
- review queue và report UI tải đủ dữ liệu theo filter hiện tại trước khi tính summary
- CSV export dùng cùng bộ filter với report table và không còn cắt ngầm ở 1000 dòng

### Fixed

- local DB docs và environment notes được đồng bộ lại với credential local đang dùng
- attendance page không còn vừa báo queued vừa hiện lỗi tải dữ liệu hôm nay trong cùng luồng UX
- manager/admin console không còn hiện CTA dẫn nhầm sang trang `/attendance` chỉ dành cho employee
- default date filter ở review/report dùng local day thay vì UTC
