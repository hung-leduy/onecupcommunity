# Đoạn video 30 s “How One Cup works” (MIT 50K VN 2026)

Đoạn motion graphics 30 giây mô phỏng cách hệ thống One Cup hoạt động, theo bộ nhận diện One Cup
(than chì #2B2E35, cam #FF7B0F, xám xanh #8D9993; Lilita One + Quicksand), chèn vào video dự thi của nhóm
ngay sau cảnh “Tap & go / Scan & go”.

| Giây | Cảnh |
|---|---|
| 0–1 | Vòng tròn cam mở ra từ ly QR của cảnh gốc |
| 1–3 | “One cup. One tap.” |
| 3–7 | ① Bộ sản phẩm: ly có QR, NFC tag trang trí, dây đeo NFC, quai/giá đỡ ly & bình giữ nhiệt có NFC |
| 7–9 | ② Liên kết ly trong app (không cần cài) |
| 9–13 | ③ Chạm ly vào đầu đọc NFC tại quầy → “Verified”, giảm giá |
| 13–17 | Phía sau một lần chạm: quầy → One Cup cloud → app sinh viên “AWESOME!”, mã quầy 6 số |
| 17–21 | ④ Điểm, chuỗi ngày, giải đấu tuần, đổi thưởng |
| 21–25 | Console cho trường/quầy/nghiên cứu (dữ liệu mô phỏng, có ghi chú) |
| 25–30 | Vòng Bring · Tap · Earn · Repeat → loé trắng nối vào “See Your Impact” |

Cảnh chuyển đặt trên vạch ô nhịp của nhạc gốc (118 BPM). Nhạc: nhạc gốc chạy tiếp vào đoạn mới, câu groove
16 phách lặp 2 lần rồi nhảy 24 phách để quay về đúng dòng thời gian gốc — từ “See Your Impact” trở đi hình và
nhạc khớp như video gốc (lệch 16 ms).

## Dựng lại

```bash
cd media/how-it-works && npm install          # GSAP
# (tuỳ chọn) chụp lại màn hình app từ server dữ liệu mẫu — xem đầu tệp capture-screens.mjs
node render.mjs <video-goc.mp4> out                      # ~4 phút: khung hình + nhạc + ghép
node render.mjs <video-goc.mp4> out --preview=5.6,11.8   # chỉ xuất ảnh xem trước
node render.mjs <video-goc.mp4> out --reuse-frames       # chỉ làm lại phần âm thanh/ghép
```

Kết quả: `out/how-it-works-30s.mp4` và `out/onecup-final.mp4` (video gốc 0–27,21 s + đoạn mới + video gốc từ 28,75 s,
tổng 69,3 s < 90 s). Cần Node 22, ffmpeg và Playwright (Chromium).
