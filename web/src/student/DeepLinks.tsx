import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, type Cup, type Me } from '../api';
import { errorText, useI18n } from '../i18n';
import { Btn3D } from '../ui/kit';
import { Mascot } from '../ui/Mascot';
import { selfScan, stationScan } from './actions';
import { markSeen, PENDING_CUP, useSession } from './session';
import { StudentShell } from './Shell';

/** /c/:code — opened by scanning a cup's QR with the phone camera or tapping its NFC sticker. */
export function CupDeepLink() {
  const { code = '' } = useParams();
  const { token } = useSession();
  if (!token) {
    sessionStorage.setItem(PENDING_CUP, code);
    return <Navigate to="/welcome" replace />;
  }
  return (
    <StudentShell nav={false}>
      <CupLinkBody code={code} />
    </StudentShell>
  );
}

function CupLinkBody({ code }: { code: string }) {
  const { token, setMe } = useSession() as { token: string; setMe: (m: Me) => void };
  const { t } = useI18n();
  const navigate = useNavigate();
  const [cup, setCup] = useState<(Cup & { mine: boolean }) | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Cup & { mine: boolean }>(`/api/cups/${encodeURIComponent(code)}`, { token }).then(setCup, (e) => setError(errorText(t, e)));
  }, [code, token, t]);

  async function act(fn: () => Promise<Me & { scan?: { id: string } }>) {
    setError(null);
    try {
      const r = await fn();
      setMe(r);
      if (r.scan) {
        markSeen(r.scan.id);
        navigate(`/me/celebrate/${r.scan.id}`, { replace: true });
      } else {
        setCup((c) => c && { ...c, linked: true, mine: true });
      }
    } catch (e) {
      setError(errorText(t, e));
    }
  }

  return (
    <div className="stack center" style={{ marginTop: 24 }}>
      <Mascot size={110} />
      <h1>{t.cupLink.title(cup?.displayCode ?? `OCC-${code.toUpperCase()}`)}</h1>
      {cup && <p className="muted">{cup.mine ? t.cupLink.mine : cup.linked ? t.cupLink.other : t.cupLink.unlinked}</p>}
      {error && <p className="error-box">{error}</p>}
      <div className="st-spacer" />
      {cup && !cup.linked && (
        <Btn3D className="block" onClick={() => act(() => api('/api/me/cups', { token, body: { code } }))}>
          {t.cupLink.link}
        </Btn3D>
      )}
      {cup?.mine && (
        <Btn3D className="block" onClick={() => act(() => selfScan(token, { code }))}>
          {t.cupLink.used}
        </Btn3D>
      )}
      <Link to="/me" className="link-btn">
        {t.common.back}
      </Link>
    </div>
  );
}

/** /s/:vendorId/:code — the rotating station code, scanned with the phone camera. */
export function StationDeepLink() {
  const { token } = useSession();
  if (!token) return <Navigate to="/welcome" replace />;
  return (
    <StudentShell nav={false}>
      <StationBody />
    </StudentShell>
  );
}

function StationBody() {
  const { vendorId = '', code = '' } = useParams();
  const { token, setMe } = useSession() as { token: string; setMe: (m: Me) => void };
  const { t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    stationScan(token, { vendorId, code }).then(
      (r) => {
        setMe(r);
        markSeen(r.scan.id);
        navigate(`/me/celebrate/${r.scan.id}`, { replace: true });
      },
      (e) => setError(errorText(t, e)),
    );
  }, [token, vendorId, code, navigate, setMe, t]);

  return (
    <div className="stack center" style={{ marginTop: 24 }}>
      <Mascot size={110} />
      <h1>{t.station.title}</h1>
      {error ? <p className="error-box">{error}</p> : <p className="muted">{t.scan.sending}</p>}
      <Link to="/me/scan" className="link-btn">
        {t.home.scan}
      </Link>
    </div>
  );
}
