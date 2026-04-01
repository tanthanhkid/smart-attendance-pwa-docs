# Scaling Strategy

## Mục tiêu
Hỗ trợ 100 chi nhánh, 5.000 nhân viên, check-in cao điểm mà vẫn phản hồi nhanh.

Seed demo hiện tại chỉ dùng 5 chi nhánh và 50 nhân viên để bootstrap nhanh; đừng lấy nó làm dữ liệu kiểm thử scale.

## 1. Write path
- Check-in/check-out là đường ghi quan trọng nhất
- Dùng transaction ngắn
- Dùng nonce/idempotency để tránh double submit
- Không tính report nặng ngay trong request

## 2. Read path
- Lịch sử cá nhân: cursor pagination
- Dashboard: pre-aggregation theo ngày / branch / department
- Export/report: hiện còn là luồng sync hoặc follow-up; nếu muốn async queue thì phải wire thực sự vào code và vận hành

## 3. Database
- PostgreSQL primary
- index theo pattern truy vấn
- partition theo tháng là bước nâng cấp khi dữ liệu tăng
- read replica cho dashboard/reporting ở giai đoạn sau

## 4. Cache
- Redis cache dashboard summary
- TTL ngắn 30–120 giây
- invalidation theo branch khi có attendance mới

## 5. API scaling
- API stateless
- scale ngang bằng nhiều container
- shared Redis cho rate limit và queue

## 6. Demo strategy
Không cần implement mọi mức scale thật trong 5 ngày, nhưng phải:
- thiết kế schema đúng
- API có pagination/filter
- README giải thích rõ đường scale tiếp theo
- không dùng seed demo nhỏ để giả vờ đã load test production
