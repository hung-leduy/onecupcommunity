# One-Cup-Community — Kế hoạch MVP (QR + NFC)

> Tổng hợp từ hai tài liệu *OneCup Project Introduction* và *Grant Application – The One-Cup-Community (VGU)*,
> và bộ thiết kế giao diện *App sinh viên (8 màn hình) · Màn hình quầy · Research console*.
> Mục tiêu: một hệ thống **chạy được ngay trên phần cứng đã mua** (đầu đọc NFC kiểu bàn phím + thẻ NTAG215) để thử luồng
> quầy – sinh viên – nghiên cứu trước giai đoạn phát triển chính (12/2026 – 02/2027) và closed beta (03/2027).

---

## 1. Yêu cầu rút ra từ tài liệu

| Yêu cầu | Nguồn | Trong MVP |
|---|---|---|
| Mỗi ly có định danh số: bình VGU khắc **QR**, ly cá nhân dán **sticker NFC** (on-metal cho bình kim loại) | Grant §b, thiết kế “Đăng ký ly” | ✔ ly `qr` / `nfc` trong cùng bảng `cups`, mã hiển thị `OCC-XXXXXX` |
| Web app nhẹ (PWA), không cần cài app | Intro §2, Grant §b | ✔ React + Vite PWA, song ngữ vi/en |
| Quầy quét ly bằng tablet/điện thoại (QR) hoặc đế NFC (“drop and go”) | Grant §b, thiết kế quầy | ✔ camera QR, đầu đọc USB kiểu bàn phím, PC/SC bridge, Web NFC (Android) |
| Quét 3 tầng: quầy xác minh (L1) · mã trạm xoay vòng (L2) · tự quét giới hạn, gắn cờ chưa xác minh (L3) | Intro §3 | ✔ chỉ L1–L2 vào phân tích H1/H3 |
| So sánh NFC vs QR (H3 của grant) | Grant H3 | ✔ `method`, `source`, thời gian giao dịch tại quầy |
| Nhánh ngẫu nhiên A đối chứng · B phản hồi · C + gamification · D + phần thưởng, phân tầng theo khoa | Intro §3, thiết kế console | ✔ phân bổ khối hoán vị theo khoa; ẩn nhánh với người tham gia |
| Phản hồi tác động, chuỗi ngày, mục tiêu ngày, mốc hành trình, giải đấu tuần, đổi thưởng | Thiết kế app | ✔ bật theo nhánh (xem §3) |
| Rút phần thưởng ở cuối pilot để đo thói quen có bền không | Intro §3, thiết kế “Đổi thưởng” | ✔ ngày `rewards_end` cấu hình trong console |
| Stepped-wedge theo cụm quầy, tỷ lệ đồ uống phục vụ bằng ly tái sử dụng | Intro §3, thiết kế console | ✔ cụm + tuần bắt đầu; quầy nhập tổng đồ uống mỗi ngày |
| Đạo đức: đồng ý nhiều lớp, giả danh, xuất/xoá dữ liệu | Intro §6, thiết kế “Hồ sơ” | ✔ Dùng app (bắt buộc) · Nghiên cứu · Dataset mở; tải dữ liệu, xoá tài khoản |
| Dynamic pricing / flash sale, escrow, micro-survey NFC, phân khúc khách hàng | Grant §b | ✘ để sau MVP |

## 2. Điểm lệch giữa hai tài liệu — cần nhóm chốt

1. **Vai trò của NFC.** Intro chỉ nói QR; Grant đặt NFC là trọng tâm (H3 NFC vs QR) nhưng mục *Outcome* chỉ ghi QR. → MVP hỗ trợ cả hai trên cùng luồng dữ liệu.
2. **Bộ giả thuyết khác nhau** giữa Intro (H1 adoption stepped-wedge, H2 can thiệp số, H3 tác động) và Grant (H1 tác động, H2 ưu đãi động, H3 NFC). Dữ liệu MVP phục vụ cả hai, nhưng **cần chốt một bộ H1–H3** trước khi xin ethics approval.
3. **Backend.** Grant ghi Firebase; MVP dùng **Node.js + SQLite** (chạy offline trên laptop, không cần cloud). Logic nhạy cảm (mã trạm HMAC, rate-limit, xuất giả danh, bốc thăm giải đấu) phải chạy phía server dù chọn nền tảng nào.
4. **Gắn NFC vào đâu.** Bình inox cần thẻ **on-metal**; thẻ thường dán thẳng lên kim loại gần như không đọc được.

## 3. Tính năng theo nhánh nghiên cứu

Nhánh được bốc khi đăng ký, **cân bằng trong từng khoa** (khối hoán vị 4: chọn ngẫu nhiên trong các nhánh đang ít người nhất của khoa đó).
Người tham gia không thấy mình ở nhánh nào (kể cả trong tệp “Tải dữ liệu của tôi”) cho đến khi kết thúc nghiên cứu.

| | A Đối chứng | B + Phản hồi | C + Gamification | D + Phần thưởng |
|---|:-:|:-:|:-:|:-:|
| Đăng ký ly, quét, lịch sử, giảm giá tại quầy | ✔ | ✔ | ✔ | ✔ |
| Tác động cá nhân (ly tránh được, nhựa, CO₂e) | | ✔ | ✔ | ✔ |
| Mục tiêu ngày, chuỗi ngày, điểm, hành trình, giải đấu | | | ✔ | ✔ |
| Đổi điểm lấy phần thưởng (đến `rewards_end`) | | | | ✔ |

- `STUDY_MODE=off` (mặc định, dùng để demo): mọi người thấy mọi tính năng. Bật `STUDY_MODE=on` khi pilot chạy thật.
- Sau `study_end`, mọi tính năng mở cho tất cả (Intro §6).

## 4. Quy tắc trò chơi & ghi nhận

- **Tầng quét.** L1 quầy quét ly; L2 sinh viên quét mã QR trên màn hình quầy hoặc gõ **mã 6 số** (đổi mỗi 30 s, chấp nhận mã của chu kỳ trước); L3 sinh viên tự quét/chạm ly của mình. Chỉ L1–L2 là “xác minh”.
- **Chống trùng.** Cùng một ly: 2 phút (quầy), 10 phút (mã trạm), 60 phút (tự quét). Lượt tự quét trước không chặn quầy ghi nhận lượt thật. Lượt trùng **bị gắn cờ** (bảng `scan_flags`) để rà soát trong console.
- **Đoán mã.** Sai mã trạm hoặc mã ly quá 10 lần/10 phút → tạm khoá (chống dò mã 6 số).
- **Điểm.** 10 điểm/lượt xác minh, 2 điểm/lượt tự quét; chỉ ly đã liên kết mới được điểm và giảm giá.
- **Mục tiêu ngày & chuỗi ngày.** Mục tiêu mặc định 3 ly/ngày (`DAILY_GOAL`). Chuỗi = số ngày liên tiếp đạt mục tiêu; hôm nay chưa đạt thì chưa làm đứt chuỗi; **thứ Bảy/Chủ nhật không làm đứt chuỗi** (campus gần như đóng).
- **Hành trình.** Mốc 10 · 25 · 50 · 100 · 250 · 500 ly.
- **Giải đấu tuần** (thứ Hai – Chủ nhật). Nhóm tối đa 30 người cùng hạng (Xanh Lá → Vàng → Kim Cương), xếp theo **lượt xác minh** trong tuần; top 5 có ít nhất 1 ly được lên hạng tuần sau. **Không xuống hạng** và người chưa có lượt nào không bị xếp hạng — chỉ hiện “N bạn khác chưa có lượt tuần này” (Intro §6: không xếp hạng tiêu cực). Bảng xếp hạng hiện tên rút gọn (“Minh Anh L”).
- **Phần thưởng.** Đổi điểm → voucher `V-XXXXXX` + QR; quầy quét voucher như quét ly, voucher chỉ dùng một lần và (nếu gắn quầy) chỉ ở quầy đó.
- **Chúc mừng.** Khi quầy quét ly, điện thoại sinh viên đang mở app tự hiện “TUYỆT VỜI!” (app hỏi server mỗi 5 giây).
- **Hệ số tác động** (tạm): 6,5 g nhựa, 53 g CO₂e ròng mỗi lần dùng lại, so với 72 g CO₂e của một ly nhựa — **phải thay bằng số liệu LCA** trước khi báo cáo.

## 5. Console nghiên cứu — định nghĩa số liệu

| Số liệu | Định nghĩa |
|---|---|
| Người tham gia (+N) | Tổng tài khoản; +N = đăng ký trong 7 ngày qua |
| Hoạt động/tuần | Số người có ít nhất 1 lượt trong 7 ngày qua; % so với 7 ngày trước đó |
| Tỷ lệ dùng ly riêng | Ly tái sử dụng ÷ tổng đồ uống bán ra, theo quầy-ngày. Trước khi cụm vào can thiệp: ly đếm tay; sau đó: lượt xác minh. “+pp” so với toàn bộ giai đoạn trước can thiệp |
| Giữ chân tuần 8 | Trong số người đăng ký ≥ 8 tuần, % có lượt xác minh trong tuần thứ 8 kể từ ngày đăng ký |
| Quét/tuần (nhánh) | Trung bình lượt xác minh mỗi người mỗi tuần kể từ khi đăng ký |
| NV quét | L1 ÷ (L1 + L2) của quầy |

**Việc vận hành bắt buộc:** mỗi quầy nhập **tổng đồ uống bán ra** mỗi ngày (tab *Hôm nay*; sửa được 7 ngày gần nhất), và trước khi cụm vào can thiệp nhập thêm số ly tái sử dụng đếm tay. Thiếu số này thì không tính được tỷ lệ cho H1.

**Trang Phân tích** (`/admin/analysis`), số liệu mô tả theo giả thuyết:
- *Tác động môi trường*: ly nhựa tránh được (chỉ lượt xác minh), nhựa và CO₂e kèm khoảng ±30% (`IMPACT_UNCERTAINTY`), tiền ly quầy tiết kiệm, chi phí giảm giá đã trả, đường cộng dồn theo tuần.
- *H1*: tỷ lệ dùng ly tái sử dụng trước/sau can thiệp theo cụm và gộp (pp), tỷ lệ toàn campus theo tuần.
- *H2*: đường giữ chân tuần 1–8 sau đăng ký theo nhánh; lượt/người/tuần của nhánh C và D 2 tuần trước và sau ngày rút thưởng.
- *H3*: NFC vs QR — lượt tại quầy, thời gian giao dịch (trung vị, P25–P75), số người, quét/tuần, giữ chân tuần 4 theo loại ly.
- *Vận hành*: bản đồ nhiệt lượt xác minh theo thứ × giờ.

Xuất dữ liệu (CSV UTF-8, mã giả danh HMAC từ `STATION_SECRET`):
- *Nghiên cứu* — từng lượt quét của người đồng ý nghiên cứu (không tên).
- *Dataset mở* — chỉ người đồng ý công bố, tổng hợp theo người × tuần, mã giả danh riêng (không nối được với tệp nghiên cứu).
- *Quầy theo ngày* — tổng đồ uống, ly đếm tay, lượt xác minh (mẫu số của H1).

## 6. Kiến trúc & dữ liệu

```
 Điện thoại sinh viên (PWA /me)        Máy quầy (/vendor)                     Nhóm nghiên cứu (/admin)
   camera QR · Web NFC · mã 6 số         đầu đọc USB kiểu bàn phím              tổng quan · quầy & cụm · xuất CSV
        │                                camera QR · Web NFC
        │                                ws://localhost:7777 ◄── nfc-bridge (PC/SC)
        └──────────────── HTTPS /api ────────────┴──► server/ (Node 22 + Express + SQLite, migration theo user_version)
```

Bảng: `users` (biệt danh, khoa, khóa, nhánh, 3 lớp đồng ý) · `cups` · `scans` (tầng, công nghệ, thiết bị, thời gian giao dịch, giảm giá, điểm) ·
`vendors` (cụm, trạm, PIN, giảm giá) · `vendor_days` · `scan_flags` · `rewards` · `redemptions` · `league_members` · `settings` (ngày pilot, tuần bắt đầu mỗi cụm, cờ dữ liệu mẫu).

Định danh: QR chứa `https://<domain>/c/<mã>`; sticker NFC được nhận diện bằng UID ở quầy, và nên ghi thêm URL NDEF cùng dạng để điện thoại (kể cả iPhone) chạm là mở trang ly.

## 7. Khác biệt so với bản thiết kế (có chủ đích)

- **Mã ly 6 ký tự** (`OCC-4K2P9X`) thay vì 4 như ảnh thiết kế: khó dò hơn khi sinh viên tự liên kết ly bằng mã.
- **Thẻ quầy không hiện tên khách**, chỉ mã ly và mức giảm giá (như thiết kế) — tôn trọng quyền riêng tư tại quầy.
- **Bảng “Các quầy”** trong console: cột “Tỷ lệ dùng ly riêng” tính trên 7 ngày gần nhất; bảng trong ảnh thiết kế bị lỗi hiển thị tiêu đề nên cột được đặt lại cho rõ.
- **Bảng xếp hạng** gộp người chưa có lượt thay vì xếp hạng 0 ly.
- **Biểu đồ nhánh** dùng một thang màu xanh 4 bậc (A nhạt → D đậm) vì các nhánh tích luỹ có thứ tự; đã kiểm tra độ tương phản và khoảng cách sáng giữa các bậc.
- Thêm: màn hình onboarding (tên, khoa, khóa, đồng ý), danh sách ly & lịch sử trong Hồ sơ, voucher trong Đổi thưởng, tab Trợ giúp của quầy (thiết bị đọc, hiệu chỉnh đầu đọc USB).

## 8. Lộ trình đề xuất

| Thời gian | Việc |
|---|---|
| **Ngay bây giờ** | Chạy `seed:demo` để cả nhóm xem giao diện; thử đầu đọc + NTAG215 theo `HARDWARE-NFC.md` §4 |
| 10–11/2026 | Chốt bộ giả thuyết, các quy tắc ở §4 (mục tiêu 3 ly/ngày? điểm tự quét?), nội dung đồng ý; dùng app làm prototype khi phỏng vấn baseline |
| 12/2026–02/2027 | Đăng nhập bằng email VGU (hiện tài khoản gắn với thiết bị); HTTPS trên tên miền thật; quyết định Firebase hay giữ Node/SQLite; dynamic pricing nếu giữ H2 của grant |
| 03/2027 | Rà soát bảo mật & quyền riêng tư; closed beta; khắc QR, dán sticker; đào tạo quầy (nhập tổng đồ uống mỗi ngày) |
| 04–06/2027 | Pilot với `STUDY_MODE=on`, cụm A/B/C vào can thiệp theo tuần đã cấu hình; rút thưởng ở `rewards_end` |

## 9. Rủi ro & câu hỏi mở

- **Đầu đọc chỉ gửi 4 byte UID** của thẻ NTAG215 (xem `HARDWARE-NFC.md`): đăng ký sticker phải dùng cùng loại đầu đọc; sinh viên liên kết bằng mã nhận/QR hoặc URL NDEF ghi trong thẻ.
- **Tài khoản gắn với thiết bị**: mất điện thoại là mất tài khoản — cần đăng nhập email VGU trước pilot.
- **Tên trên bảng xếp hạng**: đang hiện tên rút gọn do người dùng tự nhập; hội đồng đạo đức có thể yêu cầu thêm lựa chọn ẩn tên.
- **Mục tiêu 3 ly/ngày** có thể quá cao với đa số sinh viên → chuỗi ngày khó giữ; nên chốt sau khảo sát baseline.
- **HTTPS bắt buộc** cho camera và Web NFC ngoài `localhost`.
- **Gian lận**: UID và URL NDEF sao chép được; ưu đãi chỉ áp dụng khi quầy thấy ly thật (L1) hoặc mã trạm (L2), có giới hạn tần suất và gắn cờ lượt trùng.
