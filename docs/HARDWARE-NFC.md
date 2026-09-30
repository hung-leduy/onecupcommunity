# Hướng dẫn phần cứng NFC cho One-Cup MVP

## 1. Xác định đầu đọc bạn đã mua thuộc loại nào

Cắm đầu đọc vào máy tính, mở Notepad (hoặc bất kỳ ô nhập chữ nào), chạm một thẻ NFC:

| Hiện tượng | Loại | Cách nối vào One-Cup |
|---|---|---|
| Một dãy số/chữ được **gõ ra** rồi xuống dòng | **Keyboard wedge (HID)** — thường là đầu đọc "USB RFID 13.56 MHz" giá rẻ | Không cần cài gì. Terminal `/vendor` tự nghe (Cài đặt → "Nghe đầu đọc NFC USB kiểu bàn phím"). Chọn đúng **định dạng UID** (§3). |
| Không gõ gì; máy nhận là *smart card reader* (ACS ACR122U, ACR1252U, ACR1552U, Identiv…) | **PC/SC (CCID)** | Chạy `nfc-bridge` trên máy quầy (§2), bật "Kết nối PC/SC bridge" trong terminal. |
| Không có đầu đọc, nhưng có điện thoại **Android + Chrome** có NFC | **Web NFC** | Mở `/vendor` trên điện thoại qua HTTPS, bấm "Bật Web NFC". |

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

**Cách nhanh nhất:** mở `/vendor` → chạm thẻ → mục **Hiệu chỉnh đầu đọc USB** tự mở, hiện chuỗi đầu đọc gửi và cách hiểu theo từng định dạng.
Đọc cùng thẻ bằng app *NFC Tools* trên điện thoại (dòng *Serial number*), nhập vào ô "UID thật" → dòng khớp được đánh dấu ✔ → bấm **Dùng**.
Nếu chạm thẻ mà không có phản ứng gì, tăng "khoảng cách tối đa giữa 2 phím" (đầu đọc gõ chậm).

Thẻ NTAG21x có UID **7 byte**, ví dụ `04:A2:3B:4C:5D:6E:7F`. Mỗi đầu đọc có thể gõ ra:

| Đầu đọc gõ | Chọn trong Cài đặt |
|---|---|
| `04A23B4C5D6E7F` (hoặc có dấu `:` / khoảng trắng) | **HEX** |
| `1278976516` (10 chữ số — với thẻ trên là 4 byte đầu `04A23B4C` đảo byte) | **Thập phân, đảo byte** (phổ biến) hoặc **không đảo byte** — thử cả hai, chọn cái khớp với UID do Web NFC/bridge đọc |

Lưu ý: kiểu 10 chữ số chỉ chứa **4 byte đầu** của UID. UID 4 byte này sẽ **không khớp** với UID 7 byte mà Web NFC hoặc bridge đọc. Vì vậy: hoặc cấu hình đầu đọc xuất HEX đầy đủ (nhiều đầu đọc có thẻ cấu hình hoặc phần mềm đi kèm), hoặc **dùng cùng một loại đầu đọc** cho cả việc đăng ký thẻ lẫn quét tại quầy.

## 4. Kịch bản thử nghiệm với phần cứng đã mua (Sprint 0)

1. Khởi động hệ thống (xem `README.md`), đăng nhập `/vendor` bằng PIN `1111`.
2. Chạm thẻ → phải thấy **"Không nhận ra thẻ NFC …"** kèm UID. Ghi lại UID; nếu có điện thoại Android, đọc cùng thẻ bằng app *NFC Tools* để so sánh.
3. Bấm **Đăng ký thẻ này** → nhận *mã nhận* 8 ký tự + QR.
4. Trên điện thoại: mở `/me`, đăng ký, **+ Thêm cốc** → quét QR hoặc nhập mã nhận.
5. Chạm lại thẻ vào đầu đọc → **✔ tên + giảm giá**. Chạm lần nữa ngay → "vừa được quét" (chống trùng).
6. Bật **Đo thời gian giao dịch**, luân phiên 10 lượt QR (camera) và 10 lượt NFC, bấm *Khách mới* (Space) khi khách tới quầy → xem bảng H3 ở `/admin`.
7. Dán thẻ lên bình inox: thử khoảng cách/góc đọc với thẻ thường vs thẻ **on-metal**; thử sau khi rửa bình nhiều lần (độ bền lớp epoxy).
8. (Android) Trong chế độ đăng ký, bấm **Ghi URL vào thẻ** → chạm thẻ bằng iPhone/Android khi màn hình mở khoá → phải bật trang `/c/<mã>`.

Ghi lại kết quả: tỉ lệ đọc thành công, khoảng cách đọc, thời gian mỗi lượt, lỗi gặp phải — đây cũng là dữ liệu đầu vào cho giả thuyết H3.

## 5. Chọn thẻ NFC

| Thẻ | Bộ nhớ | Dùng khi |
|---|---|---|
| NTAG213 | 144 byte | Đủ cho URL ngắn (`https://domain/c/XXXXXXXX`) — rẻ nhất, khuyên dùng |
| NTAG215 / 216 | 504 / 888 byte | Nếu cần lưu thêm dữ liệu |
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
