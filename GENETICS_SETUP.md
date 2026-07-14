# Hệ thống đặc tính và lai giống

## Kiến trúc

Client React/Zustand giữ snapshot để render nhanh. Khi đã cấu hình Supabase, các thao tác mua hạt chọn lọc, gieo và thu hoạch gọi RPC `SECURITY DEFINER`. RPC khóa `game_saves` và cây liên quan, tự tính thời gian/sản lượng/chất lượng/lai giống rồi cập nhật snapshot và các bảng chuẩn hóa trong cùng transaction. Client không gửi `readyAt`, sản lượng, độ hiếm hoặc đặc tính kết quả.

Save version 5 bổ sung `specialSeeds`, `hybridDiscoveries` và genetics trong `CropInstance`. Save cũ được nâng tự động: cây đang trồng giữ nguyên `readyAt`, nhận `common`, `traits=[]`, `generation=0`.

## Cài đặt

1. Backup project production trong Supabase Dashboard.
2. Chạy lần lượt `001_game_saves.sql`, `002_multiplayer_social.sql`, rồi `003_crop_genetics_hybrids.sql` trong SQL Editor.
3. Giữ nguyên `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`; không có biến môi trường mới và không đưa service-role vào frontend.
4. Chạy `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

Migration 003 có thể chạy lại. Không xóa kho, tiền, XP, nhiệm vụ hay cây cũ.

## RPC/API

- `buy_genetic_seed(cropId, requestId)`: mua hạt chọn lọc, rarity/traits sinh trên server và idempotent theo request ID.
- `plant_crop_v2(plotIndex, cropId, seedInstanceId?)`: xác thực chủ sở hữu, ô mở/trống và trừ đúng hạt hoặc vàng.
- `harvest_crop_v2(plotIndex, requestId)`: khóa cây, xác thực thời gian, tính kết quả và ghi `harvest_logs` idempotent.
- `claim_pending_seed(rewardId)`: nhận lại hạt từ hàng chờ sau khi kho có chỗ.
- Các GET dùng RLS `SELECT` trên `seed_instances`, `player_crops`, `hybrid_recipes`, `player_hybrid_discoveries`, `pending_seed_rewards`, `harvest_logs`.

## Công thức ban đầu

- Cà chua + Ớt chuông → Cà chua cay (8%, Hiếm).
- Bí đỏ + Dưa hấu → Bí sọc khổng lồ (4%, Sử thi).
- Ngô + Cải xanh → Ngô ngọc xanh (8%, Hiếm).
- Hai cây cùng loại → hạt tuyển chọn cùng loại (6%).

Giống lai hiện dùng asset/giai đoạn của cây kết quả làm fallback, nên không có đường dẫn ảnh hỏng. Asset minh họa riêng còn thiếu cho `spicy-tomato`, `striped-pumpkin`, `emerald-corn`; có thể bổ sung sau mà không đổi schema.

## Kiểm thử thủ công

1. Mở Cửa hàng, mua “Hạt chọn lọc”, kiểm tra viền rarity và danh sách đặc tính.
2. Gieo hạt, tải lại trang/đăng nhập thiết bị khác và kiểm tra cây, thời gian, traits vẫn giữ nguyên.
3. Trồng hai cây cùng loại hoặc một cặp công thức ở cạnh trên/dưới/trái/phải; không dùng đường chéo.
4. Cho cả hai chín rồi thu hoạch. Kiểm tra toast tổng kết và Sổ lai giống.
5. Gửi cùng `requestId` tới `harvest_crop_v2` hai lần; kết quả thứ hai phải giống hệt, kho chỉ tăng một lần.
6. Làm đầy kho, lai thành công, kiểm tra “Hạt đang chờ”; bán bớt đồ rồi nhận lại.
7. Đăng nhập tài khoản khác và xác nhận không đọc/dùng được seed hoặc crop của tài khoản đầu.

## Lưu ý cân bằng

Mọi mức trait, trần bonus và tỷ lệ client nằm trong `src/config/geneticsConfig.ts`; cấu hình server nằm trong `trait_definitions`/`hybrid_recipes`. Thay đổi tỷ lệ production nên cập nhật cả hai nơi để UI mô tả đúng kết quả server.
