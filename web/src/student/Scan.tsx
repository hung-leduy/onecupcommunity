import { ChevronLeft, Info, Nfc, QrCode, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Me } from '../api';
import { errorText, useI18n } from '../i18n';
import { QrCamera } from '../scan/QrCamera';
import { startNfcScan, webNfcSupported } from '../scan/webnfc';
import { Btn3D, Sheet } from '../ui/kit';
import { classifyQr, selfScan, stationScan, type ScanResult } from './actions';
import { markSeen, useSession } from './session';
import { StudentShell } from './Shell';

export function Scan() {
  return (
    <StudentShell>
      <ScanBody />
    </StudentShell>
  );
}

function ScanBody() {
  const { token, me, setMe } = useSession() as { token: string; me: Me; setMe: (m: Me) => void };
  const { t } = useI18n();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'qr' | 'nfc'>(me.user.preferredMethod === 'nfc' ? 'nfc' : 'qr');
  const [cupId, setCupId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState('');
  const [nfcState, setNfcState] = useState<'idle' | 'waiting'>('idle');
  const stopNfc = useRef<(() => void) | null>(null);

  useEffect(() => () => stopNfc.current?.(), []);

  async function run(fn: () => Promise<ScanResult>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      setMe(r);
      markSeen(r.scan.id);
      navigate(`/me/celebrate/${r.scan.id}`, { replace: true });
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  function onQr(text: string) {
    const what = classifyQr(text);
    if (!what) return setError(t.errors.not_onecup_code);
    if (what.kind === 'station') run(() => stationScan(token, { vendorId: what.vendorId, code: what.code, cupId }));
    else run(() => selfScan(token, { code: what.code }));
  }

  async function startNfc() {
    setError(null);
    try {
      stopNfc.current = await startNfcScan(
        (r) => {
          stopNfc.current?.();
          stopNfc.current = null;
          setNfcState('idle');
          const fromUrl = r.url ? classifyQr(r.url) : null;
          run(() => selfScan(token, fromUrl?.kind === 'cup' ? { code: fromUrl.code } : { nfcUid: r.uid }));
        },
        () => setError(t.errors.bad_uid),
      );
      setNfcState('waiting');
    } catch {
      setError(t.errors.nfc_unavailable);
    }
  }

  return (
    <>
      <div className="st-topbar">
        <button className="icon-btn" onClick={() => navigate('/me')} aria-label={t.common.back}>
          <ChevronLeft size={28} strokeWidth={2.6} />
        </button>
        <h1 className="title">{t.scan.title}</h1>
        <button className="icon-btn" onClick={() => navigate('/me')} aria-label={t.common.close}>
          <X size={26} strokeWidth={2.6} />
        </button>
      </div>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={tab === 'qr'} className={tab === 'qr' ? 'on' : ''} onClick={() => setTab('qr')}>
          <QrCode size={20} /> {t.scan.qr}
        </button>
        <button role="tab" aria-selected={tab === 'nfc'} className={tab === 'nfc' ? 'on' : ''} onClick={() => setTab('nfc')}>
          <Nfc size={20} /> {t.scan.nfc}
        </button>
      </div>

      {me.cups.length > 1 && (
        <div className="stack" style={{ gap: 6 }}>
          <span className="small muted">{t.scan.whichCup}</span>
          <div className="st-cup-pick">
            {me.cups.map((c) => (
              <button key={c.id} className={cupId === c.id ? 'on' : ''} onClick={() => setCupId(c.id)}>
                {c.displayCode}
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'qr' ? (
        <QrCamera onResult={onQr} hint={busy ? t.scan.sending : t.scan.hold} mascot />
      ) : (
        <div className="st-nfc-pad">
          <Nfc className="waves" size={56} />
          {webNfcSupported() ? (
            <>
              <span>{nfcState === 'waiting' ? t.scan.nfcWaiting : t.scan.nfcTap}</span>
              {nfcState === 'idle' && (
                <Btn3D tone="blue" onClick={startNfc}>
                  {t.scan.nfcStart}
                </Btn3D>
              )}
            </>
          ) : (
            <span>{t.scan.nfcIos}</span>
          )}
        </div>
      )}

      {error && <p className="error-box">{error}</p>}

      <div className="info-box">
        <Info size={20} />
        <div>
          <b>{t.scan.infoTitle}</b>
          {t.scan.infoBody}
        </div>
      </div>

      <div className="st-spacer" />
      <button className="link-btn" onClick={() => setCodeOpen(true)}>
        {t.scan.enterCode}
      </button>

      <Sheet open={codeOpen} onClose={() => setCodeOpen(false)} title={t.scan.enterCode}>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            setCodeOpen(false);
            run(() => stationScan(token, { code, cupId }));
          }}
        >
          <p className="muted">{t.scan.codeHint}</p>
          <input
            className="code-input"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-label={t.scan.enterCode}
            autoFocus
          />
          <Btn3D className="block" disabled={code.length !== 6 || busy}>
            {t.common.confirm}
          </Btn3D>
        </form>
      </Sheet>
    </>
  );
}
