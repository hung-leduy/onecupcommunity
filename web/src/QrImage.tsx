import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

export function QrImage({ value, size = 200, label }: { value: string; size?: number; label?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: 'M' }).then(setSrc);
  }, [value, size]);
  return src ? <img src={src} width={size} height={size} alt={label ?? value} className="qr" /> : <span style={{ width: size, height: size, display: 'block' }} />;
}
