# Thiết lập multiplayer Supabase

## 1. Biến môi trường

Local (`.env.local`) và Vercel → Project Settings → Environment Variables:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLISHABLE_ANON_KEY
```

Chỉ dùng anon/publishable key ở frontend. Không tạo hoặc đưa `SUPABASE_SERVICE_ROLE_KEY` vào Vercel/frontend.

## 2. Chạy migration

Trong Supabase SQL Editor, chạy đúng thứ tự:

1. `supabase/migrations/001_game_saves.sql`
2. `supabase/migrations/002_multiplayer_social.sql`

Migration thứ hai tạo profile, farm, 24 luống, kho, tiến trình, quan hệ bạn bè, lịch sử ghé thăm, thông báo, RLS, RPC và trigger tạo dữ liệu mặc định. Tài khoản cũ được backfill; tài khoản mới được tạo toàn bộ dữ liệu trong transaction của trigger `on_auth_user_created`.

## 3. Authentication URL

Supabase Dashboard → Authentication → URL Configuration:

- Site URL: URL production Vercel, ví dụ `https://happy-farm.vercel.app`.
- Redirect URLs: thêm URL production, preview pattern phù hợp và `http://localhost:5173/**`.
- Email provider: bật Email. Nếu bật Confirm email, người dùng phải xác nhận trước khi đăng nhập.

Sau khi đổi biến môi trường trên Vercel, redeploy production.

## 4. Kiểm thử hai trình duyệt

1. Mở Chrome thường, đăng ký tài khoản A; mở cửa sổ ẩn danh/trình duyệt khác, đăng ký B.
2. Xác nhận mỗi tài khoản có 3 luống mở và dữ liệu farm khác nhau.
3. A mở Bạn bè → Tìm kiếm, tìm username B và gửi lời mời.
4. B mở chuông/ Bạn bè → Đã nhận, chấp nhận.
5. A chọn Ghé thăm; xác nhận thấy farm B và không thể trồng, thu hoạch, mở đất hay mua bán.
6. Đăng xuất A, đăng nhập B trên cùng trình duyệt; xác nhận không lóe hoặc giữ state của A.
7. Mở cùng tài khoản ở mobile/web, thao tác rồi đợi trạng thái “Đã đồng bộ”.

## 5. Chẩn đoán đăng ký

- `Database error saving new user`: thường do chưa chạy migration 002, username trùng/không hợp lệ hoặc trigger lỗi.
- Local chạy được nhưng Vercel lỗi: kiểm tra hai biến `VITE_*`, Site URL và Redirect URLs trên Supabase.
- Không nhận Realtime: kiểm tra publication `supabase_realtime` đã có `friendships` và `notifications` (migration 002 tự thêm).
- Development ghi lỗi gốc ra console; production chỉ hiển thị thông báo tiếng Việt, không lộ key/token.

## 6. Mô hình an toàn

- `game_saves` chỉ chủ tài khoản được đọc/ghi theo RLS.
- Farm bạn bè chỉ được trả về qua `get_friend_farm`, sau khi server kiểm tra quan hệ `accepted`.
- Bạn bè/thông báo chỉ thay đổi qua RPC hoặc quyền cột giới hạn.
- Profile công khai không cấp quyền đọc `coins` và `experience`; frontend không thể sửa các cột kinh tế.
