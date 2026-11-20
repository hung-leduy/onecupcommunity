# Video dự thi One Cup (~86 s, MIT 50K VN 2026)

Một clip độc lập 85,6 giây (dưới giới hạn 90 s), toàn bộ theo bộ nhận diện chiến dịch One Cup: nền kem `#EDE9DD`,
cam `#EC7D35`, vàng bơ `#EECD70`, be `#E4DDCD`, mực `#252429`; chữ **Anton** (tiêu đề), **Patrick Hand** (viết tay),
**Quicksand** (thân bài); minh họa nét tay của nhóm. Nội dung đi theo tài liệu 2 trang (`docs/mit50k/`).

| Giây | Phần trong tài liệu | Cảnh |
|---|---|---|
| 0–4 | Vấn đề | “Plastic cups are a one-night stand.” — ly nhựa rơi |
| 4–8 | | 3,1 triệu tấn rác nhựa/năm (World Bank 2022) |
| 8–12 | | “It’s not that we don’t care. It’s just a hassle.” — no reward / no feedback / no proof |
| 12–18 | | Nghị định 08/2022: 2030 — “Campuses need a habit that sticks.” |
| 18–22 | Giải pháp | Poster ONE CUP — your cup. no drama. (đúng khoảng lặng của nhạc) |
| 22–26 | | PICK YOUR TAG: NFC tag trang trí, ly QR, dây đeo NFC, quai ly/bình có NFC |
| 26–42 | | HOW IT WORKS ①–⑥ với tranh của nhóm + màn hình app thật |
| 42–46 | Đổi mới công nghệ | VERIFIED, NOT GUESSED: 3 tầng xác minh, chống ghi trùng |
| 46–51 | | PROOF, NOT PROMISES: console, nhánh nghiên cứu, quyền riêng tư (dữ liệu mô phỏng) |
| 51–55 | Mô hình kinh doanh | WHO PAYS?: thuê bao trường/quầy · tài trợ phần thưởng · bán One Cup gear |
| 55–59 | | 550.000+ tân sinh viên/năm (MOET 2024) · so sánh với giảm giá theo chuỗi |
| 59–63 | Tác động xã hội | 1.000 SV × 1 ly × 150 ngày = 150.000 ly ≈ 1 t nhựa ≈ 8 t CO₂e |
| 63–67 | | From awareness to habit |
| 67–71 | Khả thi | THE MVP ALREADY WORKS |
| 71–77 | | ROADMAP 12/2026 → 2028 |
| 77–81 | Kết | “Your bottle is a relationship.” |
| 81–86 | | ONE CUP — your cup. no drama. (đúng điểm drop của nhạc) |

Nhạc: nhạc nền từ video cũ của nhóm, kéo dài theo ô nhịp (118 BPM): chạy từ đầu đến 34,389 s, câu groove 16 phách
lặp 4 lần, nhảy 24 phách rồi chạy tiếp tới đoạn kết gốc. Mọi cảnh đổi trên vạch ô nhịp.

## Tài nguyên

- `assets/brand/` — tách từ ảnh của nhóm bằng `prepare-brand.py` (bảng HOW IT WORKS, poster, ảnh NFC tag): xoá bong
  bóng thoại đè lên tranh 4–5 (video vẽ lại), xoá chữ “Milstone” (sai chính tả) và “## gr” (chỗ trống) để video đặt
  chữ đúng; tag mẫu “PET ID” của nhà cung cấp không dùng.
  ```bash
  python3 prepare-brand.py <how-it-works.jpg> <poster.jpg> <nfc-tags.jpg> assets/brand
  ```
- `assets/*.png` — màn hình app thật chụp từ server dữ liệu mẫu bằng `capture-screens.mjs`, đổi sang bảng màu chiến dịch
  qua biến CSS lúc chụp (app trong repo giữ nguyên). Ảnh điện thoại chụp 390×800 rồi thêm dải 44 px phía trên (màu điểm
  ảnh góc trái) cho thanh trạng thái; ảnh mã quầy là vùng (440, 360, 1096, 1300) của `vendor-station.png`.
- Ly nhựa, sản phẩm (ly QR, dây đeo, quai bình), linh vật, quầy căng-tin… vẽ bằng SVG trong `art.js` theo nét tay của bộ minh họa.

## Dựng lại

```bash
cd media/onecup-video && npm install                       # GSAP + font Anton, Patrick Hand
node render.mjs <video-cu.mp4> out                         # ~12 phút → out/onecup-pitch.mp4
node render.mjs <video-cu.mp4> out --preview=6.6,41.9      # chỉ xuất ảnh xem trước
node render.mjs <video-cu.mp4> out --reuse-frames          # giữ khung hình, làm lại âm thanh
```

`<video-cu.mp4>` chỉ dùng để lấy nhạc nền. Cần Node 22, Python 3 (Pillow, NumPy, SciPy), ffmpeg và Playwright (Chromium).
