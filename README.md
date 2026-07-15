# Nông Trại Vui Vẻ

Game nông trại web nguyên bản, responsive và chơi được hoàn chỉnh theo vòng lặp: **gieo hạt → chờ thời gian thật → bón phân → thu hoạch → bán nông sản → mở rộng đất**.

## Chạy dự án

Yêu cầu: Node.js 20.19+ (khuyến nghị Node.js 22 hoặc 24).

```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal (mặc định `http://localhost:5173`).

```bash
npm run typecheck # kiểm tra TypeScript
npm run lint      # kiểm tra chất lượng source
npm test        # chạy unit test
npm run build   # build production vào dist/
npm run preview # xem bản production
```

Không cần tài khoản demo: MVP khởi tạo người chơi cục bộ tên **Bé Nông Dân** với cấp 1, 300 vàng, 10 hạt cải, 5 hạt cà rốt, 2 phân bón nhỏ và 3 luống mở sẵn.

## Tính năng đã hoàn thành

- Đúng 24 luống đất, 3 luống đầu mở sẵn; giá và cấp yêu cầu tăng dần.
- 12 loại cây độc lập, mỗi cây có 5 giai đoạn hình ảnh/biểu tượng, giá, sản lượng, XP và thời gian riêng.
- Sản lượng có seed và breakdown: chăm sóc, thời tiết, vật phẩm, may mắn và bội thu; không gọi random rải rác trong component.
- Tưới nước, nhổ cỏ, bắt sâu; 5 thời tiết bền qua reload; chu kỳ ngày/đêm theo giờ thiết bị.
- Nhân vật nông dân, cảnh quan chuyển động, đơn hàng atomic, sự kiện ngẫu nhiên, âm thanh Web Audio và rung tùy chọn.
- Lịch sử 100 lần thu hoạch và migration save version 1 → 2 không mất tiến trình cũ.
- Thời gian sinh trưởng dựa trên `plantedAt`/`readyAt`, không phụ thuộc bộ đếm UI; đóng trang rồi quay lại cây vẫn lớn.
- Popup “Trong lúc bạn vắng mặt”, báo cây đã chín nhưng không tự thu hoạch.
- Gieo hạt từ kho hoặc mua nhanh khi hết hạt.
- 5 loại phân bón: theo giây, theo phần trăm và hoàn thành ngay; có giới hạn sử dụng, không làm thời gian âm.
- Thu hoạch vào kho, giới hạn sức chứa, cộng XP và tự lên cấp.
- Kho đồ và bán toàn bộ từng loại nông sản lấy vàng.
- Cửa hàng hạt giống/phân bón, kiểm tra tiền, cấp và sức chứa.
- Nhiệm vụ tiến trình, tutorial 7 bước, cài đặt chuyển động/âm thanh và reset xác nhận 2 bước.
- Đăng ký/đăng nhập email với Supabase Auth và tự đồng bộ nông trại trên nhiều thiết bị.
- Supabase RLS bảo vệ bản lưu theo `user_id`; LocalStorage tiếp tục làm cache offline.
- Responsive: 3 cột mobile, 4 cột tablet, 6 cột desktop; bottom navigation trên mobile.
- Bảng DEV: thêm tiền, lên cấp, làm chín cây, mở đất, tua thời gian.
- 12 unit test cho thời gian, giai đoạn, phân bón, giao dịch, thu hoạch, XP và offline sync.
- Ảnh nền nông trại nguyên bản được tạo riêng cho dự án; không dùng tài sản của game thương mại.

## Placeholder / sẵn sàng mở rộng

- Xác thực toàn bộ giao dịch gameplay phía máy chủ để chống gian lận cạnh tranh (cloud save hiện vẫn nhận snapshot từ client).
- Bạn bè, thăm nông trại, chợ người chơi, bảng xếp hạng.
- Trang trí có thể đặt tự do, bản đồ nhiều khu vực, thời tiết ảnh hưởng gameplay.
- Sprite/file âm thanh thu sẵn hiện dùng emoji, CSS và Web Audio nguyên bản; có thể thay asset mà không đổi gameplay.
- Daily reward thật và nhiệm vụ nhận thưởng; hiện là giao diện/tiến trình mẫu.
- Cây tái sinh nhiều lần và sâu bệnh.

## Cấu trúc chính

```text
src/
  assets/                 # ảnh nền nguyên bản
  components/             # UI farm, popup, cửa hàng, kho
  config/
    crops.ts              # 12 cây và 5 giai đoạn
    fertilizers.ts        # 5 loại phân bón
    plotUnlockConfig.ts   # giá/cấp của 24 luống
  hooks/useGameClock.ts   # đồng hồ hiển thị
  pages/FarmPage.tsx      # màn hình game chính
  services/storageService.ts
  store/gameStore.ts      # trạng thái và action gameplay
  types/game.ts
  utils/                  # thời gian, tăng trưởng, XP, tiền tệ
tests/gameLogic.test.ts
```

## Điều chỉnh dữ liệu game

### Thêm hoặc sửa cây

Chỉnh `src/config/crops.ts`. Mỗi cây cần ID duy nhất, giá/thời gian/cấp/XP, `minHarvestQuantity`, `baseHarvestQuantity`, `maxHarvestQuantity`, `bonusYieldChance`, `maxBonusYield` và đủ 5 mục trong `growthStages`. Có thể chỉnh `perfectHarvestChance`, `perfectHarvestMultiplier` và `careYieldBonusPercent`; UI không cần sửa.

`calculateHarvestYield()` lấy một số nguyên có seed trong `[min,max]`, cộng bonus chăm sóc/thời tiết/vật phẩm/may mắn, áp dụng bội thu rồi chặn biên hợp lệ. Chỉnh tỷ lệ may mắn ở `bonusYieldChance`; chỉnh ba mốc sản lượng ngay trong định nghĩa cây.

### Thêm thời tiết hoặc sự kiện

- Thời tiết: thêm mục vào `src/config/weatherConfig.ts` với weight, duration và `cropEffects`.
- Sự kiện: thêm mục vào `src/config/randomEvents.ts` với chance, duration, cấp, daily limit, cooldown và reward.

### Thêm phân bón

Chỉnh `src/config/fertilizers.ts`, chọn `reductionType`:

- `seconds`: giảm số giây trong `reductionValue`.
- `percentage`: giảm phần trăm thời gian còn lại.
- `instant`: hoàn thành ngay.

Khai báo giá vàng và `maxUsesPerCrop`. UI cửa hàng/cây tự nhận loại mới.

### Đổi giá mở đất

Chỉnh mảng `prices` và hàm `requiredLevel` trong `src/config/plotUnlockConfig.ts`. Giá không được hard-code trong UI/store.

## Kết nối Supabase

1. Tạo một project tại [Supabase Dashboard](https://supabase.com/dashboard).
2. Mở **SQL Editor**, chạy lần lượt các file trong `supabase/migrations/` từ `001_game_saves.sql` đến `006_friend_crop_theft.sql`.
3. Xem hướng dẫn đầy đủ về Auth URL, Vercel và kiểm thử nhiều tài khoản tại [`MULTIPLAYER_SETUP.md`](./MULTIPLAYER_SETUP.md).
4. Trong **Project Settings → API**, sao chép Project URL và publishable/anon key.
5. Sao chép `.env.example` thành `.env.local`:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-anon-key
```

6. Khởi động lại `npm run dev`. Người chưa đăng nhập sẽ được chuyển thẳng tới màn hình đăng nhập/đăng ký.

Không đưa `service_role` key vào frontend. Chỉ dùng publishable/anon key; quyền dữ liệu được giới hạn bằng RLS.

Nếu **Confirm email** đang bật trong Supabase Auth, tài khoản mới phải bấm liên kết xác nhận trong email trước khi đăng nhập. Khi triển khai production, thêm domain production vào **Authentication → URL Configuration**.

## Cách lưu và thời gian offline

Zustand persist giữ key `happy-farm-save-v1` để nhận ra dữ liệu cũ, còn schema hiện là version 4. `migrateSaveGame()` bổ sung các trường gameplay còn thiếu và loại bỏ tiền kim cương mà không đổi vàng, cấp, kho, plots hoặc timestamp cây; bản lỗi được backup dưới key `happy-farm-backup-*`. Khi đăng nhập, cloud luôn được tải trước. Nếu tài khoản chưa có bản cloud nhưng thiết bị có save cũ, game bắt buộc người chơi chọn “Nhập dữ liệu cũ” hoặc “Bắt đầu nông trại mới”, không tự gán save cho tài khoản. Mỗi thay đổi được tự lưu sau 900 ms; khi mất mạng game dùng cache và tự đồng bộ lại khi online.

Mỗi cây lưu timestamp ISO tuyệt đối. `getCropGrowthState()` so sánh thời gian hiện tại với `plantedAt` và `readyAt`; interval một giây chỉ làm mới phần hiển thị.

Dữ liệu cloud được tách riêng theo tài khoản. Dù vậy, snapshot gameplay vẫn được tính ở client nên đây chưa phải cơ chế chống gian lận cho bảng xếp hạng hoặc kinh tế nhiều người chơi.

## Lộ trình tăng cường backend

Cloud save, Auth, profile, bạn bè, thông báo, ghé thăm và RLS đã hoạt động. Migration multiplayer đồng bộ dữ liệu truy vấn thường xuyên sang `profiles`, `farms`, `farm_plots`, `inventories` và `player_progress`; quan hệ xã hội chỉ thay đổi qua RPC. Snapshot gameplay vẫn được giữ để tương thích toàn bộ tính năng cũ. Trước khi xây kinh tế cạnh tranh, các thao tác mua/bán/thu hoạch còn lại cần được chuyển hoàn toàn sang RPC giao dịch chuyên biệt thay vì snapshot client.

## Tài sản hình ảnh

`src/assets/farm-background.png` được tạo bằng công cụ tạo ảnh tích hợp với prompt phong cảnh nông trại hoạt hình 2D nguyên bản, không chữ/logo/nhân vật và không mô phỏng trực tiếp giao diện hay tài sản của bất kỳ game cụ thể nào.

## Xóm nhỏ và hàng xóm

Mở từ nút **Sang Xóm nhỏ** trên nông trại hoặc deep-link `/?view=village`. Ba NPC ban đầu là Cô Hoa, Chú Ba và Chị Lan. Trạng thái của họ được resolve từ timestamp chung của game, thời tiết và ngày trong tuần; UI interval chỉ làm mới hiển thị nên reload/offline không reset vị trí.

- `src/config/npcs.ts`: hồ sơ, nhà, nơi làm việc và cấu hình quan hệ.
- `src/config/npcSchedules.ts`: lịch theo khung giờ; thêm entry mới để đổi hoạt động/địa điểm.
- `src/config/npcDialogues.ts`: câu thoại theo thời gian, thời tiết, hoạt động, shop và thân thiết.
- `src/config/npcShops.ts`: giờ mở cửa, break, hàng hóa và món ăn theo buổi.
- `src/config/npcGiftPreferences.ts`: sở thích quà tặng.
- `src/config/locations.ts`: địa điểm và kết nối trong xóm.

`resolveNpcSchedule()` xử lý cả khung giờ qua nửa đêm. Entry `walking` lưu điểm đi/đến và tính `progress` từ timestamp. Mưa chuyển Chú Ba từ ngoài đồng vào sửa dụng cụ; Chủ Nhật Cô Hoa đóng cửa sớm. Shop chỉ cho giao dịch khi đúng giờ, không trong giờ nghỉ và chủ shop có mặt.

Nói chuyện lần đầu mỗi ngày cộng 5 điểm. Quà tặng tối đa hai lần/ngày, điểm phụ thuộc `loved/liked/neutral/disliked`. Mỗi 100 điểm tăng một cấp, tối đa 5; cấp cao mở giảm giá, hàng hiếm và nhiệm vụ. Shop rotation dùng seed từ ngày + shop ID nên refresh không đổi hàng.

Save schema hiện là version 4. Migration tự tạo `npcStates`, `npcRelationships`, `npcShopStates`, `npcFarmStates`, `dialogueProgress`, food buffs và `lastNpcSyncAt`; dữ liệu farm cũ được giữ nguyên ngoại trừ trường kim cương đã bị loại bỏ.

Để thêm NPC mới, thêm hồ sơ trong `npcs.ts`, lịch trong `npcSchedules.ts`, câu thoại và quan hệ quà tương ứng. Thêm shop/món ăn trong `npcShops.ts`; `availableTimeRanges` quyết định thực đơn sáng, trưa hoặc tối và `buff.durationMinutes` quyết định thời hạn hiệu lực.
