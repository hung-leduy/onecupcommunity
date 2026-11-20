# Video dự thi One Cup (~86 s, MIT 50K VN 2026)

Một clip độc lập 85,6 giây (dưới giới hạn 90 s), toàn bộ theo bộ nhận diện chiến dịch One Cup: nền kem `#EDE9DD`,
cam `#EC7D35`, vàng bơ `#EECD70`, be `#E4DDCD`, mực `#252429`; chữ **Anton** (tiêu đề), **Patrick Hand** (viết tay),
**Quicksand** (thân bài); minh họa nét tay của nhóm.

**Bản giải thích (sau góp ý của người xem thử):** mỗi cảnh một ý và một tiêu đề ngắn; hệ thống được kể thành một luồng
duy nhất **TAG → TAP → REWARD → COUNT** với thanh tiến trình ở chân màn hình; giọng đọc chậm (~2,1 từ/giây, có ngắt câu)
và hình xuất hiện đúng lúc từ khóa được đọc (mốc câu trong `vo-timing.js`).

| Giây | Cảnh | Trên màn hình |
|---|---|---|
| 0–10 | A · Vấn đề | ly nhựa “10 MIN” rơi vào thùng rác → **3.1 MILLION TONNES** |
| 10–18 | B · Vì sao không mang ly | chai buồn · **WHY BOTHER?** · ✗ no reward · ✗ no proof it matters |
| 18–26 | C · Ý tưởng | poster ONE CUP → **TAG → TAP → REWARD** |
| 26–34 | D · Bước 1 | **TAG YOUR CUP**: tag bay lên chai, quét bằng điện thoại → LINKED |
| 34–43 | E · Bước 2 | **TAP AT THE COUNTER**: chạm đầu đọc → máy quầy “Verified” · CHECKED IN · −3,000 ₫ |
| 43–51 | F · Bước 3 | **GET REWARDED**: app “AWESOME!” · +10 points · streak · plastic saved · voucher free drink |
| 51–59 | G · Bước 4 | **EVERY CUP COUNTS**: quầy → One Cup (verified · counted once) → bảng số liệu của trường |
| 59–67 | H · Lợi nhuận | **WHO PAYS?** canteens subscribe · brands sponsor rewards · students buy tags |
| 67–75 | I · Tác động | if 1 in 10 new students joins… **8 MILLION** fewer plastic cups, every year |
| 75–81 | J · Khả thi | **IT ALREADY WORKS** (app, máy quầy, console) · campus · café · office |
| 81–86 | K · Kết | ONE CUP — your cup. no drama. + One Cup gear (ly thủy tinh, NFC tag, quai bình, dây đeo) |

## Âm thanh

- **Giọng đọc** (tiếng Anh, giọng nữ `af_heart` của Kokoro TTS — mô hình mở, Apache-2.0, chạy offline), trong `voiceover.json`.
  `voiceover.py` đọc chậm (tốc độ 0,86), ngắt 0,3 s giữa các câu, đặt câu ngay sau khi cảnh vào, bảo đảm kết thúc trước cảnh sau,
  xuất phụ đề `.srt` và `vo-timing.js` (mốc bắt đầu từng câu) để hình bám theo lời. Muốn dùng giọng thật của nhóm: thu theo đúng
  file `.srt` và thay `vo.wav`.
- **Nhạc nền**: nhạc của video cũ, **đã tách bỏ giọng đọc cũ** bằng `separate.py` (UVR MDX-Net Inst HQ 3, ONNX). Nhạc kéo dài
  theo ô nhịp (118 BPM): chạy từ đầu đến 34,389 s, câu groove 16 phách lặp 4 lần, nhảy 24 phách rồi chạy tới đoạn kết gốc;
  tự hạ âm lượng khi có lời đọc.

| Cảnh | Lời đọc |
|---|---|
| A | Plastic cups are a one-night stand: ten minutes with you, then the bin. Vietnam dumps over three million tonnes of plastic every year. |
| B | Many students own a bottle. But why bring it? There's no reward, and no proof it matters. |
| C | Meet One Cup. Tag your cup. Tap it at the counter. Get rewarded. |
| D | Step one: stick a One Cup tag on any cup you own. Scan it with your phone, and it's yours. |
| E | Step two: buy a drink, and tap your cup on the reader. One second later: checked in, with a discount. |
| F | Step three: the app adds your points, your streak, and the plastic you saved. Points become free drinks. |
| G | Step four: every tap is verified, and counted only once. So the campus sees exactly how much plastic it saves. |
| H | Who pays? Canteens subscribe: reused cups save them money. Brands sponsor rewards. Students buy tags. |
| I | If one in ten new students joins, that's eight million fewer plastic cups, every year. |
| J | And it already works. It's ready for any campus, café or office. |
| K | One Cup. Your cup, no drama. |

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
- Ly nhựa, sản phẩm (ly QR, ly thủy tinh in logo, NFC tag, dây đeo, quai bình), linh vật, quầy căng-tin… vẽ bằng SVG trong `art.js` theo nét tay của bộ minh họa.
- `assets/brand/bottle-sling.jpg` — ảnh mẫu quai đeo bình của nhóm; logo ONE CUP, linh vật và NFC charm được đặt lên bằng HTML/SVG.

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
