# Hướng dẫn phần cứng NFC cho One-Cup MVP

## 1. Xác định đầu đọc bạn đã mua thuộc loại nào

Cắm đầu đọc vào máy tính, mở Notepad (hoặc bất kỳ ô nhập chữ nào), chạm một thẻ NFC:

| Hiện tượng | Loại | Cách nối vào One-Cup |
|---|---|---|
| Một dãy số/chữ được **gõ ra** rồi xuống dòng | **Keyboard wedge (HID)** — thường là đầu đọc "USB RFID 13.56 MHz" giá rẻ | Không cần cài gì. Terminal `/vendor` tự nghe ở mọi tab (Trợ giúp → Thiết bị đọc). Chọn đúng **định dạng UID** (§3). |
| Không gõ gì; máy nhận là *smart card reader* (ACS ACR122U, ACR1252U, ACR1552U, Identiv…) | **PC/SC (CCID)** | Chạy `nfc-bridge` trên máy quầy (§2), bật "PC/SC bridge" trong Trợ giúp → Thiết bị đọc. |
| Không có đầu đọc, nhưng có điện thoại **Android + Chrome** có NFC | **Web NFC** | Mở `/vendor` trên điện thoại qua HTTPS, Trợ giúp → "Bật Web NFC". |

Trình duyệt không truy cập trực tiếp được đầu đọc PC/SC (Chrome chặn lớp thiết bị smart card trong WebUSB), vì vậy mới cần `nfc-bridge`.

## 2. Chạy nfc-bridge (đầu đọc PC/SC)

```bash
# Linux (Ubuntu/Debian)
sudo apt install pcscd libpcsclite-dev build-essential
# ACR122U trên Linux: gỡ driver kernel đang chiếm thiết bị
echo -e "blacklist pn533_usb\nblacklist pn533\nblacklist nfc" | sudo tee /etc/modprobe.d/blacklist-nfc.conf
sudo modprobe -r pn533_usb pn533 nfc; sudo systemctl restart pcscd

# Windows: cài driver PC/SC của hãng (ACS: "ACS Unified PC/SC Driver"), cài Node.js 22 LTS + "Tools for Native Modules".
# macOS: dùng được ngay (CCID có sẵn), cần Xcode Command Line Tools.

cd nfc-bridge
npm install
npm start                                    # ws://127.0.0.1:7777
# Khi triển khai, chỉ cho phép trang terminal thật kết nối:
ALLOWED_ORIGINS=https://onecup.example.edu.vn npm start
```

Khi chạm thẻ, cửa sổ bridge in `tag 04A23B4C5D6E7F …` và terminal hiển thị kết quả. Không có phần cứng? `node mock.js` giả lập bridge: gõ UID + Enter.

## 3. Định dạng UID của đầu đọc kiểu bàn phím

**Cách nhanh nhất:** mở `/vendor` → tab **Trợ giúp** → chạm thẻ → mục **Hiệu chỉnh đầu đọc USB** hiện chuỗi đầu đọc gửi và cách hiểu theo từng định dạng (mục này tự mở khi định dạng đang chọn không đọc được).
Mặc định terminal dùng **Thập phân, đảo byte** — đúng với đầu đọc của dự án.
Đọc cùng thẻ bằng app *NFC Tools* trên điện thoại (dòng *Serial number*), nhập vào ô "UID thật" → dòng khớp được đánh dấu ✔ → bấm **Dùng**.
Nếu chạm thẻ mà không có phản ứng gì, tăng "khoảng cách tối đa giữa 2 phím" (đầu đọc gõ chậm).

Thẻ NTAG21x có UID **7 byte**, ví dụ `04:A2:3B:4C:5D:6E:7F`. Mỗi đầu đọc có thể gõ ra:

| Đầu đọc gõ | Chọn trong Cài đặt |
|---|---|
| `04A23B4C5D6E7F` (hoặc có dấu `:` / khoảng trắng) | **HEX** |
| `1278976516` (10 chữ số — với thẻ trên là 4 byte đầu `04A23B4C` đảo byte) | **Thập phân, đảo byte** (phổ biến) hoặc **không đảo byte** — thử cả hai, chọn cái khớp với UID do Web NFC/bridge đọc |

Lưu ý: kiểu 10 chữ số chỉ chứa **4 byte đầu** của UID. UID 4 byte này sẽ **không khớp** với UID 7 byte mà Web NFC hoặc bridge đọc. Vì vậy: hoặc cấu hình đầu đọc xuất HEX đầy đủ (nhiều đầu đọc có thẻ cấu hình hoặc phần mềm đi kèm), hoặc **dùng cùng một loại đầu đọc** cho cả việc đăng ký thẻ lẫn quét tại quầy.

### Đầu đọc của dự án (đã kiểm tra 30/09/2026)

- Loại **keyboard wedge**, gõ **10 chữ số thập phân** rồi Enter, ví dụ `0566367322`.
- Tức là chỉ **4 byte** UID: `0566367322` = `0x21C2145A` → hệ thống lưu `5A14C221` (đảo byte, mặc định của terminal).
- Thẻ đã mua: **NTAG215** (NXP, ISO 14443A, 504 byte, đọc 1–5 cm) — UID thật dài **7 byte, luôn bắt đầu bằng `04`**.
- `5A14C221` / `21C2145A` đều không bắt đầu bằng `04` → đầu đọc **không gửi 4 byte đầu**; nhiều khả năng là 4 byte cuối của UID.
  Xác nhận bằng mục *Hiệu chỉnh* trong terminal: nhập *Serial number* đọc từ app NFC Tools, bảng sẽ hiện "khớp 4 byte cuối" ở dòng đúng.
- 5 thẻ đã quét (01/10/2026): `0566367322`→`5A14C221`, `0562029658`→`5AE47F21`, `0515269722`→`5A64B61E`,
  `0613061722`→`5A948A24`, `0566363226`→`5A04C221`. Cả 5 khác nhau, nhưng **byte `5A` lặp lại ở mọi thẻ**, nên có thể đó là
  byte thứ hai của UID (sau `04`), tức đầu đọc gửi byte 1–4. Chỉ còn 3 byte phân biệt các thẻ (≈16 triệu giá trị), vẫn đủ cho pilot.
  Cần *Serial number* từ app NFC Tools để xác nhận.
- Hệ quả: đăng ký thẻ và quét ở quầy **phải cùng dùng loại đầu đọc này**; sinh viên liên kết thẻ bằng mã nhận/QR do quầy hiện ra
  (chạm thẻ bằng điện thoại Android sẽ đọc đủ 7 byte, không khớp với 4 byte mà quầy đã lưu).
- Tin tốt từ NTAG215: ghi được bản ghi NDEF URL `https://<domain>/c/<mã>` (bằng nút *Ghi URL vào thẻ* trên Android, hoặc app NFC Tools →
  Write → URL), sau đó cả **iPhone và Android** chạm thẻ là mở trang cốc. 504 byte là dư cho URL này. Thẻ ghi/xoá được 100.000 lần,
  nên chỉ khoá chỉ-đọc khi đã phát cho người dùng.
- Khoảng đọc 1–5 cm: với bình inox cần thẻ **on-metal**, và nên đánh dấu vị trí "chạm vào đây" trên đầu đọc ở quầy.

## 4. Kịch bản thử nghiệm với phần cứng đã mua (Sprint 0)

1. Khởi động hệ thống (xem `README.md`), chạy `npm run seed -w server`, đăng nhập `/vendor` bằng PIN `1111` (Campus Café).
2. Chạm thẻ → phải thấy **"Không nhận ra sticker …"** kèm UID. Ghi lại UID; đọc cùng thẻ bằng app *NFC Tools* trên điện thoại để so sánh (Trợ giúp → Hiệu chỉnh).
3. Bấm **Đăng ký sticker này** → nhận *mã nhận* dạng `OCC-XXXXXX` + QR.
4. Trên điện thoại: mở `/me`, đăng ký tài khoản → bước **Đăng ký ly** (hoặc Hồ sơ → Thêm ly) → quét QR hoặc nhập mã nhận.
5. Chạm lại thẻ vào đầu đọc → quầy hiện **✔ Đã xác minh · OCC-… · Áp dụng giảm …**, điện thoại sinh viên (đang mở app) hiện **TUYỆT VỜI!** trong vài giây. Chạm lần nữa ngay → "vừa được quét" (chống trùng, được gắn cờ trong console).
6. Bật **Đo thời gian giao dịch** (Trợ giúp → Thiết bị đọc), luân phiên 10 lượt QR (camera) và 10 lượt NFC, bấm *Khách mới* (Space) khi khách tới quầy → cột `tx_duration_ms` trong tệp xuất nghiên cứu (`/admin` → Xuất dữ liệu).
7. Dán thẻ lên bình inox: thử khoảng cách/góc đọc với thẻ thường vs thẻ **on-metal**; thử sau khi rửa bình nhiều lần (độ bền lớp epoxy).
8. (Android) Sau khi đăng ký sticker, bấm **Ghi URL vào sticker** → chạm thẻ bằng iPhone/Android khi màn hình mở khoá → phải bật trang `/c/<mã>`.

Ghi lại kết quả: tỉ lệ đọc thành công, khoảng cách đọc, thời gian mỗi lượt, lỗi gặp phải — đây cũng là dữ liệu đầu vào cho giả thuyết H3.

## 5. Chọn thẻ NFC

| Thẻ | Bộ nhớ | Dùng khi |
|---|---|---|
| NTAG213 | 144 byte | Đủ cho URL ngắn (`https://domain/c/XXXXXXXX`) — rẻ nhất |
| **NTAG215** (dự án đang dùng) / 216 | 504 / 888 byte | Dư chỗ cho URL; dùng tốt |
| NTAG **on-metal / anti-metal** (có lớp ferrite, bọc epoxy) | như trên | **Bắt buộc** cho bình inox/nhôm; thẻ thường dán thẳng lên kim loại gần như không đọc được |
| NTAG 424 DNA (SUN) | — | Giai đoạn sau: mỗi lần chạm sinh URL có chữ ký mật mã → không sao chép được, cho phép tự quét được coi là xác thực |

Bảo mật:

- UID và URL trong NTAG21x **sao chép được**. MVP chấp nhận điều này vì lượt tính ưu đãi phải có nhân viên quầy quét cốc thật (tier 1) và có giới hạn tần suất.
- Sau khi ghi URL và kiểm thử xong, có thể **khoá thẻ chỉ-đọc** (app *NFC Tools* → Other → Lock tag). Thao tác **không đảo ngược** — chỉ làm với thẻ phát cho người dùng thật.

## 6. Máy quầy nên dùng gì

| Thiết bị quầy | QR | NFC |
|---|---|---|
| Laptop/PC + đầu đọc USB | webcam hoặc máy quét mã vạch USB (cũng là kiểu bàn phím — nhập vào ô "Nhập mã cốc") | bàn phím HID hoặc PC/SC + bridge |
| Điện thoại/tablet Android | camera | Web NFC có sẵn, hoặc đầu đọc USB-C kiểu bàn phím |
| iPad / iPhone | camera | chỉ đầu đọc USB-C kiểu bàn phím (Safari không có Web NFC) |

Camera và Web NFC chỉ chạy trong *secure context*: `https://…` hoặc `http://localhost`. Khi thử điện thoại qua mạng LAN, chạy `HTTPS=1 npm run dev:web` (chứng chỉ tự ký — chấp nhận cảnh báo trên điện thoại).
