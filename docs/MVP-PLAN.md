# One-Cup-Community — Kế hoạch MVP (QR + NFC)

> Tổng hợp từ hai tài liệu: *OneCup Project Introduction* và *Grant Application – The One-Cup-Community (VGU)*.
> Mục tiêu của MVP: có một hệ thống **chạy được ngay trên phần cứng đã mua** (đầu đọc NFC + thẻ NFC) để
> thử luồng quầy – sinh viên – quản trị, trước giai đoạn phát triển chính (12/2026 – 02/2027) và closed beta (03/2027).

---

## 1. Yêu cầu rút ra từ tài liệu

| Yêu cầu trong tài liệu | Nguồn | Trong MVP |
|---|---|---|
| Mỗi cốc có định danh số: cốc VGU khắc **QR**, bình cá nhân dán **thẻ NFC epoxy chống kim loại** | Grant §b | ✔ Cốc `qr` / `nfc`, cùng một bảng `cups` |
| Web app nhẹ (PWA), **không cần cài app native** | Intro §2, Grant §b | ✔ React + Vite PWA |
| Quầy quét cốc bằng tablet/điện thoại (QR) hoặc trạm đọc NFC ("drop and go") | Grant §b | ✔ Camera QR, Web NFC (Android), đầu đọc USB (kiểu bàn phím hoặc PC/SC qua bridge) |
| Mô hình quét 3 tầng: quầy xác thực · mã trạm xoay vòng · tự quét bị giới hạn và gắn cờ chưa xác thực | Intro §3 | ✔ tier 1 / 2 / 3, chỉ tier 1–2 là `verified` |
| So sánh NFC vs QR: tốc độ giao dịch, tỉ lệ dùng, bỏ cuộc (H3 của grant) | Grant H3 | ✔ ghi `method` + `source` mỗi lượt, bộ đếm thời gian giao dịch tại quầy, bảng thống kê H3 |
| Các nhánh thí nghiệm ngẫu nhiên: control / feedback / feedback+gamification / gamification+rewards (H2 của Intro) | Intro §3 | ✔ gán `arm` ngẫu nhiên khi đăng ký; bật/tắt bằng `STUDY_MODE` |
| Phản hồi tác động cá nhân (nhựa, CO₂e), huy hiệu | Intro §2, Grant §b | ✔ hệ số cấu hình được (đang là **giá trị tạm**) |
| Ưu đãi giá tại quầy | Grant §b | ✔ giảm giá cố định theo quầy (dynamic pricing để sau) |
| Đạo đức nghiên cứu: đồng ý nhiều lớp, bí danh, xuất / xoá dữ liệu bất cứ lúc nào | Intro §6 | ✔ 2 checkbox đồng ý, xuất JSON, xoá tài khoản, CSV nghiên cứu chỉ gồm người đồng ý + ID giả danh |
| Dữ liệu chuỗi thời gian cho phân tích (ITS, OLS) | Intro §3, Grant timeline | ✔ bảng `scans` có timestamp, quầy, tier, method → xuất CSV |
| Dynamic pricing / flash sale, escrow, NFC micro-survey trên bàn, phân khúc khách hàng | Grant §b | ✘ để sau MVP (xem §6) |
| Leaderboard | Intro §2 | ✘ cố ý bỏ: Intro §6 yêu cầu không xếp hạng tiêu cực |

## 2. Điểm lệch giữa hai tài liệu — cần nhóm chốt

1. **Vai trò của NFC.** Intro chỉ nói QR; Grant đặt NFC là trọng tâm (tên đề tài "NFC-Enabled", H3 NFC vs QR), nhưng mục *Outcome* của Grant lại chỉ ghi "QR-code technology". → MVP hỗ trợ **cả hai**, cùng một luồng dữ liệu, để thí nghiệm A/B được.
2. **Bộ giả thuyết khác nhau.** Intro: H1 adoption (stepped-wedge ITS), H2 các can thiệp số, H3 lợi ích môi trường/kinh tế. Grant: H1 lợi ích môi trường, H2 ưu đãi động vs chiến dịch tĩnh, H3 NFC giảm ma sát. → Dữ liệu MVP phục vụ được cả hai (method, tier, arm, vendor, thời gian), nhưng **nhóm cần chốt một bộ H1–H3** trước khi xin ethics approval.
3. **Backend.** Grant ghi React + Firebase. MVP dùng **Node.js + SQLite** (một tiến trình, chạy offline trên laptop quầy, không cần tài khoản cloud) để thử phần cứng ngay. Logic nhạy cảm (mã trạm HMAC, rate-limit, export giả danh) đằng nào cũng phải chạy phía server (Cloud Functions nếu dùng Firebase). API mỏng, 4 bảng — chuyển sang Firestore + Functions là việc có thể làm ở giai đoạn 12/2026 nếu nhóm vẫn chọn Firebase.
4. **Gắn NFC vào đâu.** Grant: NFC cho bình kim loại cá nhân, QR khắc laser cho cốc VGU. → cần tag **on-metal** (có lớp ferrite) cho bình inox; tag thường sẽ không đọc được khi dán trực tiếp lên kim loại.

## 3. Phạm vi MVP

**Có:**

- **Sinh viên** (`/me`): đăng ký bằng biệt danh + đồng ý; liên kết cốc (quét QR, nhập mã, hoặc chạm thẻ NFC bằng Android); xem số lần dùng, nhựa/CO₂e, huy hiệu, lịch sử; tự quét (tier 3); quét mã trạm (tier 2); xuất / xoá dữ liệu.
- **Deep link** `/c/:code`: QR khắc trên cốc và URL ghi vào thẻ NFC đều trỏ về đây. Điện thoại (kể cả iPhone — iOS đọc được thẻ NDEF URL) mở app để liên kết hoặc tự quét.
- **Terminal quầy** (`/vendor`): đăng nhập bằng PIN; nhận dữ liệu đồng thời từ 4 nguồn — camera QR, Web NFC, đầu đọc USB kiểu bàn phím, PC/SC bridge; hiển thị kết quả lớn + âm báo + mức giảm giá; chế độ **đăng ký thẻ NFC mới** (sinh mã nhận để sinh viên liên kết, ghi URL vào thẻ bằng Web NFC); bộ đếm thời gian giao dịch (phím Space) cho H3.
- **Màn hình trạm** (`/vendor/station`): QR đổi mỗi 30 s (HMAC), sinh viên quét để được ghi nhận có xác thực khi quầy không quét cốc.
- **Quản trị** (`/admin`): số liệu tổng, bảng H3 theo công nghệ, theo ngày, theo nhánh, theo quầy; tạo quầy; tạo lô mã cốc QR + trang in nhãn; xuất CSV nghiên cứu.

**Chưa có (có chủ đích):** đăng nhập SSO/email (tài khoản gắn với thiết bị), dynamic pricing, escrow/đặt cọc cốc, micro-survey NFC, thông báo đẩy, đa ngôn ngữ, phân quyền admin chi tiết, chống sao chép thẻ bằng mật mã (xem `HARDWARE-NFC.md` §5).

## 4. Kiến trúc

```
 Điện thoại sinh viên (PWA)            Máy quầy (laptop/tablet, trình duyệt)
 ├─ /me  /c/:code  /s/:vendor/:code    ├─ /vendor  terminal
 │   camera QR · Web NFC (Android)     │   ├─ camera QR (qr-scanner)
 │                                     │   ├─ Web NFC (Chrome Android)
 │                                     │   ├─ USB reader kiểu bàn phím ──► bắt chuỗi phím nhanh + Enter
 │                                     │   └─ WebSocket ws://localhost:7777 ◄── nfc-bridge (Node, PC/SC)
 │                                     │                                        ▲ USB: ACR122U/ACR1252U…
 └───────────── HTTPS /api ────────────┴──► server/ (Node 22 + Express + SQLite)
                                              users · vendors · cups · scans
```

- `server/` — API REST, cũng phục vụ bản build của web (`web/dist`). Chạy trực tiếp TypeScript bằng Node ≥ 22.18, cơ sở dữ liệu `node:sqlite` (không cần module native).
- `web/` — React 19 + Vite + vite-plugin-pwa.
- `nfc-bridge/` — tiến trình nhỏ chạy trên máy quầy, đọc UID từ đầu đọc PC/SC (`nfc-pcsc`) và đẩy vào trình duyệt qua WebSocket chỉ nghe ở `127.0.0.1`.

### Định danh

| Vật mang | Khoá định danh | Nội dung in/ghi |
|---|---|---|
| Cốc QR | `code` 8 ký tự (bỏ 0/O/1/I/L) | QR chứa `https://<domain>/c/<code>` + in mã chữ bên dưới |
| Thẻ NFC | `nfc_uid` (UID phần cứng, hex, 7 byte với NTAG) + `code` để nhận thẻ | (khuyến nghị) bản ghi NDEF URL `https://<domain>/c/<code>` |

Quầy luôn dùng **UID** (đọc được với mọi loại đầu đọc, không phụ thuộc nội dung ghi trong thẻ). URL NDEF chỉ để điện thoại sinh viên mở app.

### Mô hình dữ liệu (`server/src/db.ts`)

- `users(id, token, nickname, arm, preferred_method, consent_participate, consent_research, created_at)`
- `vendors(id, name, pin, token, discount_vnd, created_at)`
- `cups(id, kind, code, nfc_uid, user_id, linked_at, created_at)`
- `scans(id, cup_id, user_id, vendor_id, tier, verified, method, source, tx_duration_ms, discount_vnd, created_at)`

### Quy tắc ghi nhận

- Tier 1 (quầy) và tier 2 (mã trạm) = **verified**; tier 3 (tự quét) = unverified.
- Chống trùng: một cốc không được ghi lại trong 2 phút (quầy), 10 phút (trạm), 60 phút (tự quét). Tự quét trước **không** chặn quầy ghi nhận lượt thật.
- Cốc chưa liên kết vẫn được ghi lượt (đếm tỉ lệ đồ uống bằng cốc tái sử dụng cho H1) nhưng không có ưu đãi.

## 5. Gắn với câu hỏi nghiên cứu

| | Dữ liệu MVP thu | Phân tích |
|---|---|---|
| Adoption (H1 Intro) | lượt verified theo quầy × ngày | ITS / stepped-wedge theo tuần, cần thêm **tổng số đồ uống bán ra** mỗi quầy (nhập tay hoặc từ POS) để ra tỉ lệ |
| Can thiệp số (H2 Intro) | `arm` của từng người, lịch sử lượt | So sánh retention giữa các nhánh khi `STUDY_MODE=on` |
| NFC vs QR (H3 Grant) | `method`, `source`, `tx_duration_ms`, `preferred_method` | Thời gian giao dịch trung bình/median theo công nghệ, tỉ lệ quay lại theo công nghệ |
| Tác động (H3 Intro / H1 Grant) | số lượt verified × hệ số | Thay hệ số tạm (12 g nhựa, 50 g CO₂e / cốc) bằng số liệu LCA chọn từ Lee et al. (2025) + phân tích độ nhạy |

## 6. Lộ trình đề xuất

| Thời gian | Việc |
|---|---|
| **Ngay bây giờ** (Sprint 0) | Chạy MVP trên laptop, thử đầu đọc + thẻ theo `HARDWARE-NFC.md` §4; chốt loại đầu đọc cho quầy và loại tag cho bình kim loại |
| 10–11/2026 | Chốt bộ giả thuyết, wireframe UI/UX; dùng MVP làm prototype khi phỏng vấn/khảo sát baseline |
| 12/2026–02/2027 | Quyết định Firebase hay giữ Node/SQLite; đăng nhập bằng email VGU; nhập số đồ uống bán ra theo quầy; dynamic pricing; triển khai HTTPS trên tên miền thật |
| 03/2027 | Rà soát bảo mật & quyền riêng tư; closed beta; khắc QR, dán tag; đào tạo nhân viên quầy |
| 04–06/2027 | Pilot, `STUDY_MODE=on`, rollout theo bậc thang từng quầy |

## 7. Rủi ro & câu hỏi mở

- **Loại đầu đọc đã mua?** Kiểu bàn phím hay PC/SC quyết định cách nối (xem `HARDWARE-NFC.md`). Đầu đọc bàn phím giá rẻ thường chỉ xuất 4 byte UID dạng thập phân → phải dùng **cùng loại đầu đọc** cho đăng ký và quét, hoặc cấu hình đầu đọc xuất HEX đủ 7 byte.
- **Máy quầy là gì?** iPad/iPhone không có Web NFC → quầy dùng iPad chỉ quét QR bằng camera, hoặc cắm đầu đọc USB-C kiểu bàn phím.
- **HTTPS bắt buộc** cho camera và Web NFC khi không phải `localhost` → cần tên miền + chứng chỉ trước beta.
- **Tài khoản gắn với thiết bị**: mất điện thoại = mất tài khoản. Cần đăng nhập email VGU trước pilot.
- **Gian lận**: UID và URL NDEF đều sao chép được; MVP dựa vào nhân viên quầy nhìn thấy cốc thật (tier 1) và rate-limit. Nếu tự quét có giá trị thưởng, cân nhắc NTAG 424 DNA (SUN).
- **Hệ số tác động** hiện là placeholder — không được dùng để báo cáo.
