# Đoạn video 30 s “How One Cup works” (MIT 50K VN 2026)

Đoạn motion graphics 30 giây chèn vào video dự thi ngay sau cảnh “Tap & go / Scan & go”, theo bộ nhận diện
chiến dịch One Cup: nền kem `#EDE9DD`, cam `#EC7D35`, vàng bơ `#EECD70`, be `#E4DDCD`, mực `#252429`;
chữ **Anton** (tiêu đề), **Patrick Hand** (chữ viết tay), **Quicksand** (thân bài); minh họa nét tay của nhóm.

| Giây | Cảnh |
|---|---|
| 0–1 | Vòng tròn mở ra từ ly QR của cảnh gốc |
| 1–3 | Poster “ONE CUP — your cup. no drama.” (chữ trồi lên, tagline tự viết) |
| 3–7 | PICK YOUR TAG: NFC tag trang trí (ảnh sản phẩm + tag linh vật One Cup) → ly QR, dây đeo NFC, quai bình/ly có NFC, dấu “COMING SOON” |
| 7–9 | HOW IT WORKS ① Register your NFC tag ② Attach it to your tumbler + màn hình đăng ký |
| 9–13 | ③ TAP & CHECK IN: tranh đầu đọc + sóng NFC, màn hình quầy “Verified”, dấu “CHECKED IN!” |
| 13–17 | ④ KEEP SHOWING UP: tháp ly mọc dần, mèo “I am waiting on top”, app “AWESOME!” |
| 17–21 | ⑤–⑥ SEE YOUR COMMUNITY: bảng xếp hạng, voucher, thẻ “Total cups saved” tự lấp đầy, app |
| 21–25 | FOR THE CAMPUS: console (ghi rõ dữ liệu mô phỏng) |
| 25–30 | “Plastic cups are a one-night stand. Your bottle is a relationship.” → loé trắng nối “See Your Impact” |

Cảnh chuyển đặt trên vạch ô nhịp của nhạc gốc (118 BPM). Nhạc gốc chạy tiếp vào đoạn mới, câu groove 16 phách
lặp 2 lần rồi nhảy 24 phách để quay về đúng dòng thời gian gốc — từ “See Your Impact” trở đi hình và nhạc khớp
như video gốc (lệch 16 ms).

## Tài nguyên

- `assets/brand/` — tách từ ảnh của nhóm bằng `prepare-brand.py` (bảng HOW IT WORKS, poster, ảnh NFC tag):
  xoá bong bóng thoại đè lên tranh 4–5 (video vẽ lại), xoá chữ “Milstone” (sai chính tả) và “## gr” (chỗ trống)
  để video đặt chữ đúng; tag mẫu “PET ID” của nhà cung cấp không dùng.
  ```bash
  python3 prepare-brand.py <how-it-works.jpg> <poster.jpg> <nfc-tags.jpg> assets/brand
  ```
- `assets/*.png` — màn hình app thật chụp từ server dữ liệu mẫu bằng `capture-screens.mjs`, được đổi sang bảng màu
  chiến dịch qua biến CSS lúc chụp (app trong repo giữ nguyên). Ảnh điện thoại chụp 390×800 rồi thêm dải 44 px phía
  trên (màu điểm ảnh góc trái) cho thanh trạng thái; ảnh mã quầy là vùng (440, 360, 1096, 1300) của `vendor-station.png`.

## Dựng lại

```bash
cd media/how-it-works && npm install          # GSAP + font Anton, Patrick Hand
node render.mjs <video-goc.mp4> out                      # ~4 phút: khung hình + nhạc + ghép
node render.mjs <video-goc.mp4> out --preview=5.6,11.8   # chỉ xuất ảnh xem trước
node render.mjs <video-goc.mp4> out --reuse-frames       # chỉ làm lại phần âm thanh/ghép
```

Kết quả: `out/how-it-works-30s.mp4` và `out/onecup-final.mp4` (video gốc 0–27,21 s + đoạn mới + video gốc từ 28,75 s,
tổng 69,3 s < 90 s). Cần Node 22, Python 3 (Pillow, NumPy, SciPy), ffmpeg và Playwright (Chromium).
