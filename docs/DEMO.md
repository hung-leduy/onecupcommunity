# Kịch bản demo One-Cup (≈ 15 phút)

Hai server chạy cùng lúc trên máy tính quầy:

| Server | Cổng | Dữ liệu | Dùng để |
|---|---|---|---|
| **Live** | 3000 | `live.sqlite` — trống, bạn tạo trong lúc demo | Quầy + điện thoại + đầu đọc thật |
| **Showcase** | 3001 | `showcase.sqlite` — dữ liệu mẫu 386 người, 11 tuần | Console có biểu đồ đẹp |

## 0. Chuẩn bị (làm trước buổi demo)

**Thiết bị:** laptop (cắm đầu đọc NFC USB, có webcam), điện thoại cùng Wi-Fi, 1–2 ly đã dán thẻ NTAG215 ở đáy (đánh dấu chỗ đặt ly trên đầu đọc).

**Cài & cập nhật** (cmd, trong thư mục dự án):
```bat
git pull
npm install
npm run build
ipconfig
```
Ghi lại IPv4 của laptop, ví dụ `192.168.1.20` (thay vào mọi chỗ `<IP>` bên dưới).

**Dữ liệu showcase** (chỉ cần chạy một lần):
```bat
cd server
set DB_PATH=showcase.sqlite
set PUBLIC_URL=http://<IP>:3001
npm run seed:demo -- --force
cd ..
```
Lệnh in ra link người dùng mẫu “Minh Anh Lê” (`…/me#t=…`) — lưu lại.

**Dữ liệu live** (tạo 4 quầy, PIN 1111–4444):
```bat
cd server
set DB_PATH=live.sqlite
npm run seed
cd ..
```

**Ghi URL vào thẻ** (để điện thoại chạm là mở trang ly) — làm sau bước 3 khi đã có mã `OCC-…` của thẻ:
NFC Tools → Write → Add a record → URL → `http://<IP>:3000/c/<mã không có OCC->` → Write → chạm thẻ.

## 1. Mở hai server (mỗi cái một cửa sổ cmd)

**Cửa sổ 1 — Live:**
```bat
set DB_PATH=live.sqlite
set PUBLIC_URL=http://<IP>:3000
set COOLDOWN_COUNTER_MIN=0
set COOLDOWN_SELF_MIN=0
set POINTS_VERIFIED=100
npm start
```
- `COOLDOWN…=0`: quét cùng một ly nhiều lần liên tiếp không bị chặn.
- `POINTS_VERIFIED=100`: 2 lượt quét là đủ điểm đổi “Upsize miễn phí” (150 điểm).
- **Chỉ dùng cho demo** — khi chạy pilot bỏ các dòng này.

**Cửa sổ 2 — Showcase:**
```bat
set PORT=3001
set DB_PATH=showcase.sqlite
set PUBLIC_URL=http://<IP>:3001
npm start
```
Windows hỏi tường lửa → **Allow**.

**Mở sẵn các tab trên laptop:**
1. `http://localhost:3000/vendor` → PIN `1111`, tên nhân viên → màn hình quầy.
2. `http://localhost:3000/vendor/station` → màn hình mã quầy (nếu có màn hình thứ hai, quay về phía khán giả).
3. `http://localhost:3001/admin` → admin key `change-me-admin` → console showcase.
4. `http://localhost:3000/admin` → console live.

**Điện thoại:** mở `http://<IP>:3000/` (chưa đăng ký).

## 2. Kịch bản trình bày

| # | Nói gì | Làm gì | Thấy gì |
|---|---|---|---|
| 1 | Vấn đề: VGU có ly tái sử dụng nhưng ít người dùng — cần biết *vì sao* và đo được *thay đổi* | Điện thoại: trang chủ → **Sinh viên & cán bộ** | Màn hình đăng ký |
| 2 | Tham gia tự nguyện, đồng ý nhiều lớp, có thể rút | Nhập tên, khoa, khóa → **Tiếp tục** → bật “Đưa dữ liệu vào nghiên cứu” → **Đồng ý & tiếp tục** | Bước **Đăng ký ly** |
| 3 | Mỗi ly có mã riêng; sticker NFC đăng ký ngay tại quầy | Laptop (tab quầy): đặt ly lên đầu đọc → **Đăng ký sticker này** | Quầy hiện **Sticker mới · OCC-…** + QR |
| 4 | Sinh viên liên kết ly với tài khoản | Điện thoại: chọn **Ly riêng của tôi** → **Quét mã trên ly** → gõ mã `OCC-…` → **Liên kết** | “Đã liên kết ly OCC-…!” → **Tiếp tục** về trang chủ |
| 5 | **“Đặt ly là xong”** — NFC giảm ma sát (H3) | Để điện thoại ở trang chủ; đặt ly lên đầu đọc | Quầy: **✔ Đã xác minh · Áp dụng giảm 3.000 đ** · Điện thoại sau vài giây: **TUYỆT VỜI!** (+1 ly, −3.000 đ, +điểm, nhựa, CO₂e) |
| 6 | Mục tiêu ngày, chuỗi ngày, hành trình, xếp hạng (gamification, H2) | Đặt ly thêm 1–2 lần; trên điện thoại xem **Trang chủ**, **Hành trình**, **Xếp hạng** | Vòng mục tiêu tăng, mốc 10 ly, bảng xếp hạng tuần |
| 7 | Quầy đông? Khách tự quét mã quầy — vẫn được xác minh | Điện thoại: **Quét ly của tôi → Nhập mã 6 số** → gõ mã trên tab `/vendor/station` | Chúc mừng “… · mã quầy” |
| 8 | Chạm điện thoại vào ly (iPhone cũng được) = tự quét, **chưa xác minh** | Mở khoá điện thoại, chạm vào đáy ly (thẻ đã ghi URL) → **Tôi vừa dùng ly này** | Chúc mừng “tự quét · chưa xác minh” — giải thích 3 tầng dữ liệu |
| 9 | Phần thưởng — và rút thưởng cuối pilot để đo thói quen có bền | Điện thoại: **Đổi thưởng → Upsize miễn phí → Đổi** → mở voucher | QR + mã `V-XXXXXX` |
| 10 | Quầy xác nhận voucher | Laptop: **Quét ly khách** → đưa QR voucher trên điện thoại vào webcam (hoặc gõ `V-XXXXXX` vào ô nhập) | **Voucher hợp lệ · Upsize miễn phí**; quét lại → “đã được dùng” |
| 11 | Số liệu của quầy | Tab quầy → **Hôm nay** → nhập *Tổng đồ uống đã bán* (vd 20) → **Lưu** | % đồ uống bằng ly tái sử dụng, biểu đồ theo giờ, tiền ly tiết kiệm |
| 12 | Quyền riêng tư | Điện thoại: **Hồ sơ** → các công tắc đồng ý, **Tải dữ liệu của tôi**, đổi **Ngôn ngữ → EN** | Toàn bộ app chuyển tiếng Anh |
| 13 | Dữ liệu thật vừa tạo đi thẳng vào console | Tab `localhost:3000/admin` → **Chất lượng dữ liệu** | Các lượt L1 / L2 / L3 vừa demo |
| 14 | Pilot 12 tuần sẽ trông như thế nào | Tab `localhost:3001/admin` (nhãn **DỮ LIỆU MẪU**) → **Tổng quan** → **Phân tích** | Stepped-wedge theo cụm, nhánh A–D, NFC 2,1 s vs QR 4,4 s, tác động môi trường, bản đồ nhiệt |
| 15 | Dữ liệu mở & minh bạch | Showcase → **Xuất dữ liệu** | 3 tệp CSV (nghiên cứu, dataset mở, quầy theo ngày) |

Muốn cho xem app của một người đã dùng 11 tuần: mở link “Minh Anh Lê” đã lưu (dạng `http://<IP>:3001/me#t=…`) trên điện thoại.

## 3. Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Chạm thẻ không có phản ứng | Bấm chuột vào vùng trống của trang quầy (đầu đọc gõ phím vào chỗ đang chọn); đặt ly sát đầu đọc (1–5 cm) |
| “… vừa được quét” | Chưa đặt `COOLDOWN_COUNTER_MIN=0`, hoặc đợi 2 phút |
| Điện thoại không mở được `http://<IP>:3000` | Cùng Wi-Fi? Tường lửa Windows đã Allow Node.js? Wi-Fi khách/trường có thể chặn kết nối giữa máy — dùng hotspot điện thoại |
| Điện thoại không có “TUYỆT VỜI!” sau khi quầy quét | App phải đang mở ở trang Trang chủ; chờ ~5 giây |
| Camera trên điện thoại không mở | Cần HTTPS — trong demo hãy gõ mã thay vì quét |
| “Chưa đủ” khi đổi thưởng | Chưa đặt `POINTS_VERIFIED=100`, hoặc quét thêm vài lượt |

## 4. Sau buổi demo

- Dừng hai server (Ctrl+C). Xoá `server/live.sqlite*` để làm lại từ đầu; giữ `showcase.sqlite` cho lần sau.
- Lần sau chỉ cần: `npm run seed` cho `live.sqlite` → mở hai server như mục 1.
