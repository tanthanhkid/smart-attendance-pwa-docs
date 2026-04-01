# Release Guide

Tài liệu này mô tả cách chốt một bản release cho repo theo GitHub flow.

## Mục tiêu

- giữ `main` luôn sạch và runnable
- có branch release rõ ràng trước khi merge
- có tag và changelog cho từng mốc quan trọng
- release phải đi kèm kiểm tra thực tế

## Release Flow

### 1. Chuẩn bị branch

Tạo branch release từ `main`:

```bash
git checkout main
git pull origin main
git checkout -b release/vX.Y.Z
```

### 2. Chốt phạm vi

Release branch chỉ nên chứa:

- tính năng đã sẵn sàng
- fix quan trọng
- docs cập nhật khớp behavior
- cleanup tối thiểu để ổn định release

Không nên đưa vào:

- feature lớn chưa test xong
- refactor không liên quan
- thay đổi làm lệch scope release

### 3. Verify trước PR

Chạy tối thiểu:

```bash
pnpm typecheck
pnpm test
```

Nếu có thay đổi UI hoặc deployment:

```bash
pnpm --filter @smart-attendance/web typecheck
pnpm --filter @smart-attendance/api test
```

Nếu có release web cần deploy:

```bash
netlify build
netlify deploy --prod
```

hoặc deploy preview trước khi promote lên production.

### 4. PR và review

PR release phải ghi rõ:

- mục tiêu release
- những thay đổi đã chốt
- test đã chạy
- rủi ro còn lại
- bước deploy/verify nếu có

Review nên kiểm tra:

- docs đã khớp code
- API shape không bị phá ngầm
- local boot vẫn hoạt động
- không có hardcode bất thường cho môi trường

### 5. Merge và tag

Sau khi OK:

```bash
git checkout main
git pull origin main
git merge --no-ff release/vX.Y.Z
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --tags
```

### 6. Post-release

- cập nhật `CHANGELOG.md`
- cập nhật `CURRENT_STATE.md` nếu behavior thay đổi
- lưu link PR/release note
- verify production/preview URL nếu có deploy web

## Versioning

Khuyến nghị dùng `MAJOR.MINOR.PATCH`:

- `PATCH`: fix nhỏ, docs, polish
- `MINOR`: thêm tính năng mới tương đối trọn vẹn
- `MAJOR`: thay đổi lớn, breaking behavior

## Netlify note

Nếu web deploy qua Netlify:

- deploy preview trước để verify
- dùng CLI kiểm tra build/deploy thay vì chỉ tin giao diện local
- ghi rõ URL preview/production trong PR hoặc release note
- phải cấu hình `NEXT_PUBLIC_API_URL` tới API public nếu muốn chạy full flow

## Release Checklist

- branch release đã được tạo
- `pnpm typecheck` pass
- `pnpm test` pass
- docs đã cập nhật
- changelog đã ghi
- tag version đã tạo
- deploy đã verify nếu có
