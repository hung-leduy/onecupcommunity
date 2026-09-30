import QrScanner from 'qr-scanner';
import { useEffect, useRef, useState } from 'react';

/** Camera QR scanner. Calls onResult once per distinct payload (repeats allowed after 3 s). */
export function QrCamera({ onResult, onClose }: { onResult: (text: string) => void; onClose?: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onResult);
  cb.current = onResult;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!video.current) return;
    let lastText = '';
    let lastAt = 0;
    const scanner = new QrScanner(
      video.current,
      (r) => {
        const t = Date.now();
        if (r.data === lastText && t - lastAt < 3000) return;
        lastText = r.data;
        lastAt = t;
        navigator.vibrate?.(60);
        cb.current(r.data);
      },
      { preferredCamera: 'environment', highlightScanRegion: true, maxScansPerSecond: 10, returnDetailedScanResult: true },
    );
    scanner.start().catch((e) => setError(String(e?.message ?? e) + ' — camera cần HTTPS hoặc localhost và quyền truy cập.'));
    return () => { scanner.stop(); scanner.destroy(); };
  }, []);

  return (
    <div className="camera">
      <video ref={video} muted playsInline />
      {error && <p className="error">{error}</p>}
      {onClose && <button className="secondary" onClick={onClose}>Đóng camera</button>}
    </div>
  );
}
