import QrScanner from 'qr-scanner';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n';
import { Mascot } from '../ui/Mascot';

/**
 * Camera QR scanner in the design's viewfinder. Calls onResult once per distinct payload
 * (the same payload again only after 3 s).
 */
export function QrCamera({ onResult, hint, mascot = false }: { onResult: (text: string) => void; hint?: string; mascot?: boolean }) {
  const { t } = useI18n();
  const video = useRef<HTMLVideoElement>(null);
  const cb = useRef(onResult);
  cb.current = onResult;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!video.current) return;
    let lastText = '';
    let lastAt = 0;
    const scanner = new QrScanner(
      video.current,
      (r) => {
        const now = Date.now();
        if (r.data === lastText && now - lastAt < 3000) return;
        lastText = r.data;
        lastAt = now;
        navigator.vibrate?.(60);
        cb.current(r.data);
      },
      { preferredCamera: 'environment', maxScansPerSecond: 10, returnDetailedScanResult: true },
    );
    scanner.start().catch(() => setFailed(true));
    return () => {
      scanner.stop();
      scanner.destroy();
    };
  }, []);

  return (
    <div className="camera">
      <video ref={video} muted playsInline />
      <div className="camera__frame" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="camera__scanline" aria-hidden="true" />
      {hint && <span className="camera__hint">{hint}</span>}
      {mascot && <Mascot size={70} className="camera__mascot" />}
      {failed && <p className="camera__error">{t.errors.camera}</p>}
    </div>
  );
}
