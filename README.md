# One-Cup-Community — MVP

Ứng dụng web (PWA) ghi nhận việc tái sử dụng ly tại VGU bằng **QR code** và **NFC**, song ngữ **Tiếng Việt / English** —
phục vụ đề tài *One-Cup-Community: An NFC-Enabled Digital Platform for Sustainable Behavioral Change* (Sustainability Working Group, VGU).
Giao diện dựng theo bộ thiết kế *App sinh viên · Màn hình quầy · Research console*.

- Kế hoạch, phạm vi và các quyết định thiết kế: [`docs/MVP-PLAN.md`](docs/MVP-PLAN.md)
- Đầu đọc NFC, thẻ NTAG215, kịch bản thử phần cứng: [`docs/HARDWARE-NFC.md`](docs/HARDWARE-NFC.md)

## Ba ứng dụng trong một

| Đường dẫn | Dành cho | Màn hình |
|---|---|---|
| `/me` | Sinh viên & cán bộ (điện thoại) | Trang chủ (mục tiêu ngày, chuỗi ngày, tác động, giải đấu) · Dùng ly của tôi (QR / NFC / mã 6 số) · Chúc mừng · Hành trình · Bảng xếp hạng · Đổi thưởng · Đăng ký ly · Hồ sơ & quyền riêng tư |
| `/vendor` | Nhân viên quầy (tablet/laptop + đầu đọc USB) | Quét · Hôm nay · Trợ giúp (thiết bị đọc, hiệu chỉnh) · `/vendor/station` màn hình mã quầy xoay vòng |
| `/admin` | Nhóm nghiên cứu | Tổng quan pilot · Quầy & cụm · Người tham gia · Nhánh nghiên cứu · Chất lượng dữ liệu · Xuất dữ liệu · Ly & mã QR |

Ngôn ngữ đổi ở Hồ sơ (sinh viên), Trợ giúp (quầy), chân thanh bên (console) và trang chủ `/`.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `server/` | API Node.js 22 + Express + SQLite (`node:sqlite`, có migration), phục vụ luôn bản build web |
| `web/` | React 19 + Vite PWA; `src/student`, `src/vendor`, `src/console`, `src/i18n` (vi/en), `src/ui` (linh vật, nút 3D, biểu đồ) |
| `nfc-bridge/` | Chạy trên máy quầy có đầu đọc PC/SC (ACR122U…), đẩy UID thẻ vào terminal qua WebSocket |

## Chạy thử

Yêu cầu Node.js ≥ 22.6 (khuyên dùng bản 22 LTS mới nhất).

```bash
npm install
npm run seed -w server          # 4 quầy pilot (PIN 1111–4444) trong 3 cụm, 3 phần thưởng

# Xem với dữ liệu mẫu (≈386 người tham gia, 11 tuần pilot) — console sẽ gắn nhãn "DỮ LIỆU MẪU"
npm run seed:demo -w server     # in ra link đăng nhập của người dùng mẫu "Minh Anh Lê"

# Cách 1 — phát triển (2 terminal)
npm run dev:server              # API :3000
npm run dev:web                 # http://localhost:5173  (HTTPS=1 để thử trên điện thoại qua LAN)

# Cách 2 — một tiến trình
npm run build && PUBLIC_URL=http://localhost:3000 npm start   # http://localhost:3000
```

`seed:demo` từ chối ghi đè cơ sở dữ liệu đã có người tham gia; thêm `-- --force` để xoá và tạo lại.
Console: mở `/admin`, nhập `ADMIN_KEY` (mặc định `change-me-admin`).

## Cấu hình (biến môi trường của server)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` · `DB_PATH` | `3000` · `onecup.sqlite` | |
| `PUBLIC_URL` | `http://localhost:5173` | Tên miền trong QR của ly, URL ghi vào thẻ NFC, mã quầy |
| `ADMIN_KEY` | `change-me-admin` | **Đổi khi triển khai** |
| `STATION_SECRET` | `change-me-station-secret` | Khoá sinh mã quầy 6 số và mã giả danh khi xuất dữ liệu — **đổi và giữ bí mật** |
| `STATION_CODE_TTL_SEC` | `30` | Chu kỳ đổi mã quầy |
| `STUDY_MODE` | `off` | `on` = áp dụng nhánh thí nghiệm A–D; `off` = mọi người thấy mọi tính năng (demo) |
| `DAILY_GOAL` | `3` | Số ly/ngày để hoàn thành mục tiêu và giữ chuỗi ngày |
| `POINTS_VERIFIED` · `POINTS_SELF` | `10` · `2` | Điểm cho lượt xác minh / lượt tự quét |
| `CUP_COST_VND` | `3000` | Tiền ly nhựa quầy tiết kiệm mỗi ly tái sử dụng (màn hình Hôm nay) |
| `IMPACT_PLASTIC_G` · `IMPACT_CO2E_G` · `IMPACT_SINGLE_USE_CO2E_G` | `6.5` · `53` · `72` | Hệ số tác động mỗi ly — **giá trị tạm**, thay bằng số liệu LCA |
| `COOLDOWN_COUNTER_MIN` / `_STATION_MIN` / `_SELF_MIN` | `2` / `10` / `60` | Chống ghi trùng (lượt trùng được gắn cờ) |
| `LEAGUE_GROUP_SIZE` · `LEAGUE_PROMOTE` | `30` · `5` | Giải đấu tuần: số người mỗi nhóm, số người lên hạng |
| `PILOT_START` · `PILOT_WEEKS` · `STUDY_END` · `REWARDS_END` | `2027-04-12` · `12` · `2027-06-30` · `2027-06-14` | Giá trị mặc định; sửa trong console → Quầy → Cấu hình pilot |
| `TZ_OFFSET_MIN` | `420` | Múi giờ (UTC+7) |

## Kiểm thử

```bash
npm test                        # API + logic (node:test, có đồng hồ giả để thử chuỗi ngày, giải đấu)
npm run build                   # typecheck + build web
```
