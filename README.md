# One-Cup-Community — MVP

Ứng dụng web (PWA) ghi nhận việc tái sử dụng cốc tại VGU bằng **QR code** và **NFC** — phục vụ đề tài
*One-Cup-Community: An NFC-Enabled Digital Platform for Sustainable Behavioral Change* (Sustainability Working Group, VGU).

- Kế hoạch & phạm vi MVP, đối chiếu với hồ sơ đề tài: [`docs/MVP-PLAN.md`](docs/MVP-PLAN.md)
- Kết nối đầu đọc NFC, chọn thẻ, kịch bản thử phần cứng: [`docs/HARDWARE-NFC.md`](docs/HARDWARE-NFC.md)

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| `server/` | API Node.js 22 + Express + SQLite (`node:sqlite`), phục vụ luôn bản build web |
| `web/` | React + Vite PWA: trang sinh viên `/me`, terminal quầy `/vendor`, màn hình mã trạm `/vendor/station`, quản trị `/admin` |
| `nfc-bridge/` | Chạy trên máy quầy có đầu đọc PC/SC (ACR122U…), đẩy UID thẻ vào terminal qua WebSocket |

## Chạy thử

Yêu cầu Node.js ≥ 22.18.

```bash
npm install
npm run seed -w server          # tạo 2 quầy mẫu: PIN 1111 (Canteen VGU), 2222 (Café Thư viện)

# Cách 1 — phát triển (2 terminal)
npm run dev:server              # API :3000
npm run dev:web                 # http://localhost:5173  (HTTPS=1 để thử trên điện thoại qua LAN)

# Cách 2 — một tiến trình
npm run build && PUBLIC_URL=http://localhost:3000 npm start   # http://localhost:3000
```

Admin: mở `/admin`, nhập `ADMIN_KEY` (mặc định `change-me-admin`).

Đầu đọc PC/SC: `cd nfc-bridge && npm install && npm start`, rồi trong `/vendor` → *Cài đặt thiết bị đọc* → bật *Kết nối PC/SC bridge*.
Đầu đọc kiểu bàn phím: không cần cài gì — chạm thẻ khi terminal đang mở.

## Cấu hình (biến môi trường của server)

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | `3000` | |
| `DB_PATH` | `onecup.sqlite` | |
| `PUBLIC_URL` | `http://localhost:5173` | Tên miền dùng trong QR của cốc và URL ghi vào thẻ NFC |
| `ADMIN_KEY` | `change-me-admin` | **Đổi khi triển khai** |
| `STATION_SECRET` | `change-me-station-secret` | Khoá sinh mã trạm xoay vòng và ID giả danh khi xuất CSV — **đổi khi triển khai** |
| `STATION_CODE_TTL_SEC` | `30` | Chu kỳ đổi mã trạm |
| `STUDY_MODE` | `off` | `on` = bật chia nhánh thí nghiệm (control / feedback / …) |
| `COOLDOWN_COUNTER_MIN` / `_STATION_MIN` / `_SELF_MIN` | `2` / `10` / `60` | Chống ghi trùng |
| `IMPACT_PLASTIC_G` / `IMPACT_CO2E_G` | `12` / `50` | Hệ số mỗi cốc — **giá trị tạm**, thay bằng số liệu LCA |

## Kiểm thử

```bash
npm test                        # test API + logic (node:test)
npm run build                   # typecheck + build web
```
