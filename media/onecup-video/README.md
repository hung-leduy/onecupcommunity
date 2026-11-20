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
| 46–51 | | PROOF, NOT PROMISES: console, thử nghiệm “nudge” nào hiệu quả, đo từng ly, quyền riêng tư (dữ liệu mô phỏng) |
| 51–55 | Mô hình kinh doanh | WHO PAYS?: thuê bao trường/quầy · tài trợ phần thưởng · bán One Cup gear |
| 55–59 | | 550.000+ tân sinh viên/năm (MOET 2024) · so sánh với giảm giá theo chuỗi |
| 59–63 | Tác động xã hội | 1/10 tân sinh viên (55.000) × 1 ly × 150 ngày = 8,27 triệu ly/năm ≈ 54 t nhựa ≈ 440 t CO₂e |
| 63–67 | | From awareness to habit |
| 67–71 | Khả thi | THE MVP ALREADY WORKS |
| 71–77 | Lợi nhuận + tác động | GROWS WITH EVERY CUP: revenue ↑ / impact ↑, linh vật leo bậc thị trường: trường đại học VN → café & văn phòng → Đông Nam Á (không có mốc triển khai) |
| 77–81 | Kết | “Your bottle is a relationship.” |
| 81–86 | | ONE CUP — your cup. no drama. (đúng điểm drop của nhạc) |

## Âm thanh

- **Giọng đọc** (tiếng Anh, giọng nữ `af_heart` của Kokoro TTS — mô hình mở, Apache-2.0, chạy offline): một câu cho mỗi cảnh,
  viết theo đúng chữ trên màn hình, trong `voiceover.json`. `voiceover.py` đặt mỗi câu 0,18 s sau khi cảnh vào và bảo đảm
  câu kết thúc trước khi cảnh sau trượt vào (đọc nhanh hơn tối đa 1,18× nếu cần); xuất kèm phụ đề `.srt`.
  Muốn dùng giọng thật của nhóm: thu theo đúng file `.srt` và thay `vo.wav`.
- **Nhạc nền**: nhạc của video cũ, **đã tách bỏ giọng đọc cũ** bằng `separate.py` (UVR MDX-Net Inst HQ 3, ONNX) — bản cũ
  có lời đọc lẫn trong nhạc nên khi lặp nhạc thì lời bị lặp. Nhạc kéo dài theo ô nhịp (118 BPM): chạy từ đầu đến 34,389 s,
  câu groove 16 phách lặp 4 lần, nhảy 24 phách rồi chạy tới đoạn kết gốc; tự hạ âm lượng khi có lời đọc.

| Cảnh | Lời đọc |
|---|---|
| 01 | Plastic cups are a one-night stand. Ten minutes, then the bin. |
| 02 | Vietnam dumps 3.1 million tonnes of plastic every year. |
| 03 | It's not that we don't care. It's just a hassle. |
| 04 | By twenty thirty, single-use plastics are out. Campuses need a habit that sticks. |
| 05 | Meet One Cup. Reuse, made easy. |
| 06 | Pick your tag: NFC tags, QR cups, lanyards and straps. |
| 07 | Register it in the app, then attach it to any tumbler. |
| 08 | Order, tap the reader, and you're checked in, with a discount. |
| 09 | Every check-in stacks your cup: points, streaks, milestones. |
| 10 | See your community, earn rewards, and watch your impact grow. |
| 11 | Every reuse is verified at the counter, and never counted twice. |
| 12 | Live data for the campus: proof, not promises. |
| 13 | Campuses subscribe, brands sponsor, students buy the gear. |
| 14 | Over half a million new students a year. Any cup, every outlet. |
| 15 | If one in ten new students joins: eight million cups a year. |
| 16 | From awareness to habit, with the cup you already own. |
| 17 | And it's real: the app, the counter and the console already work. |
| 18 | Profit and impact grow together, from campuses to cafés, offices and Southeast Asia. |
| 19 | Because your bottle is a relationship. |
| 20 | One Cup. Your cup, no drama. |

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
pip install onnxruntime kokoro-onnx librosa soundfile scipy
# mô hình (không lưu trong repo):
#   UVR-MDX-NET-Inst_HQ_3.onnx  github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/
#   kokoro-v1.0.onnx, voices-v1.0.bin  github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/
ffmpeg -i <video-cu.mp4> -vn -ar 48000 orig.wav
python3 separate.py UVR-MDX-NET-Inst_HQ_3.onnx orig.wav music.wav           # bỏ giọng đọc cũ
python3 voiceover.py kokoro-v1.0.onnx voices-v1.0.bin vo.wav vo.srt         # giọng đọc mới + phụ đề
node render.mjs music.wav out --vo=vo.wav                                   # ~12 phút → out/onecup-pitch.mp4
node render.mjs music.wav out --preview=6.6,41.9                            # chỉ ảnh xem trước
node render.mjs music.wav out --vo=vo.wav --reuse-frames                    # giữ hình, làm lại âm thanh
```

Cần Node 22, Python 3 (Pillow, NumPy, SciPy, librosa, soundfile, onnxruntime, kokoro-onnx), ffmpeg và Playwright (Chromium).
