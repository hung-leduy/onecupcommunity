import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { QrImage } from '../QrImage';
import { useI18n } from '../i18n';
import { Mascot } from '../ui/Mascot';
import { useVendorSession } from './terminal';
import '../styles/vendor.css';

/** Customer-facing screen with the rotating station code (tier 2 scans). */
export function Station() {
  const { token, vendor } = useVendorSession();
  const { t } = useI18n();
  const [data, setData] = useState<{ code: string; expiresAt: number; url: string } | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const d = await api<{ code: string; expiresAt: number; url: string }>('/api/vendor/station-code', { token });
        setData(d);
        timer = setTimeout(load, Math.max(1000, d.expiresAt - Date.now() + 250));
      } catch {
        timer = setTimeout(load, 5000);
      }
    };
    load();
    return () => clearTimeout(timer);
  }, [token]);

  useEffect(() => {
    const i = setInterval(() => setLeft(data ? Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000)) : 0), 250);
    return () => clearInterval(i);
  }, [data]);

  if (!token)
    return (
      <div className="vd-app">
        <p className="center" style={{ padding: 40 }}>
          {t.vendor.stationScreen.needLogin} <Link to="/vendor">{t.vendor.signIn}</Link>
        </p>
      </div>
    );

  return (
    <div className="vd-station">
      <h1>{vendor?.name ?? ''}</h1>
      <p className="vd-station__prompt">{t.vendor.stationScreen.prompt}</p>
      <div className="vd-station__qr">{data && <QrImage value={data.url} size={300} />}</div>
      <p className="muted">{t.vendor.stationScreen.typeIt}</p>
      <p className="vd-station__code">{data ? `${data.code.slice(0, 3)} ${data.code.slice(3)}` : '— — —'}</p>
      <p className="vd-station__timer">{t.vendor.stationScreen.next(left)}</p>
      <Mascot size={80} />
      <Link to="/vendor/help" className="muted small">
        {t.vendor.stationScreen.back}
      </Link>
    </div>
  );
}
