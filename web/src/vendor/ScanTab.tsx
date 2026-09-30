import { Check, CircleAlert, Nfc, ScanLine, Ticket, TriangleAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { QrImage } from '../QrImage';
import { useI18n } from '../i18n';
import { QrCamera } from '../scan/QrCamera';
import { readerToHex } from '../scan/uid';
import { webNfcSupported, writeNfcUrl } from '../scan/webnfc';
import { useTerminal, type Result } from './terminal';

export function ScanTab() {
  const term = useTerminal();
  const { t, f } = useI18n();
  const [camera, setCamera] = useState(false);
  const [manual, setManual] = useState('');
  const today = term.today;

  return (
    <>
      {term.registerMode && (
        <div className="vd-register-banner">
          <Nfc size={22} />
          <span className="grow">{t.vendor.registerBanner}</span>
          <button className="plain-btn" onClick={() => term.setRegisterMode(false)}>
            {t.vendor.registerDone}
          </button>
        </div>
      )}

      {camera ? (
        <div className="stack">
          <QrCamera onResult={(text) => term.handle({ method: 'qr', source: 'camera', value: text })} />
          <button className="plain-btn" onClick={() => setCamera(false)}>
            {t.vendor.closeCamera}
          </button>
        </div>
      ) : (
        <button className="vd-scan-btn" onClick={() => (term.registerMode ? undefined : setCamera(true))} disabled={term.registerMode}>
          <span className="vd-scan-btn__icon">
            <ScanLine size={52} strokeWidth={2.4} />
          </span>
          <b>{t.vendor.scanBig}</b>
          <span>{t.vendor.scanSub}</span>
        </button>
      )}

      {term.settings.timer && !term.registerMode && (
        <button className={`plain-btn vd-timer ${term.timerStart ? 'on' : ''}`} onClick={term.startTimer}>
          {term.timerStart ? t.vendor.timing : t.vendor.newCustomer}
        </button>
      )}

      <ResultCard result={term.result} />

      <section className="card vd-recent">
        <div className="row between">
          <h2>{t.vendor.recent}</h2>
          <span className="muted" style={{ fontWeight: 800 }}>
            {t.vendor.today(today?.scansToday ?? 0)}
          </span>
        </div>
        {today && today.recent.length === 0 && <p className="muted">{t.vendor.noScans}</p>}
        <ul>
          {today?.recent.slice(0, 6).map((s) => (
            <li key={s.id}>
              <span className="muted">{f.time(s.created_at)}</span>
              <b className="grow">{s.displayCode}</b>
              <span className="tone-yellow">{s.discount_vnd > 0 ? `−${f.num(s.discount_vnd)}` : ''}</span>
            </li>
          ))}
        </ul>
      </section>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const v = manual.trim();
          if (!v) return;
          // A USB reader typing into this field sends its usual 10-digit decimal: read it with the reader's format.
          const fromReader = /^\d{8,10}$/.test(v) ? readerToHex(v, term.settings.usbFormat) : null;
          if (fromReader) {
            term.handle({ method: 'nfc', source: 'usb-hid', value: fromReader });
            setManual('');
            return;
          }
          // UIDs: anything with separators ("04:A2:…") or 4/7/10-byte hex; cup codes have 6 characters.
          const isUid = term.registerMode || /[:\- ]/.test(v.replace(/^V-|^OCC-/i, '')) || /^([0-9A-Fa-f]{8}|[0-9A-Fa-f]{14}|[0-9A-Fa-f]{20})$/.test(v);
          term.handle(isUid ? { method: 'nfc', source: 'manual', value: v } : { method: 'qr', source: 'manual', value: v });
          setManual('');
        }}
      >
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t.vendor.manual} aria-label={t.vendor.manual} />
        <button className="plain-btn">{t.common.send}</button>
      </form>

      {!term.registerMode && (
        <button className="link-btn" onClick={() => term.setRegisterMode(true)}>
          <Nfc size={16} style={{ verticalAlign: '-3px' }} /> {t.vendor.register}
        </button>
      )}
    </>
  );
}

function ResultCard({ result }: { result: Result | null }) {
  const { t, f, lang } = useI18n();
  const term = useTerminal();
  const [write, setWrite] = useState<string | null>(null);
  useEffect(() => setWrite(null), [result]);
  if (!result) return null;

  const box = (tone: string, icon: React.ReactNode, title: React.ReactNode, sub?: React.ReactNode, extra?: React.ReactNode) => (
    <section className={`vd-result vd-result--${tone}`} role="status">
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span className="vd-result__icon">{icon}</span>
        <div className="grow">
          <b>{title}</b>
          {sub && <span>{sub}</span>}
        </div>
        <button className="icon-btn" onClick={term.clearResult} aria-label={t.common.close}>
          <X size={20} />
        </button>
      </div>
      {extra}
    </section>
  );

  switch (result.kind) {
    case 'ok':
      return box(
        'green',
        <Check size={26} strokeWidth={3.2} />,
        t.vendor.ok(result.code),
        <>
          {result.discountVnd > 0 ? t.vendor.discount(f.vnd(result.discountVnd)) : t.vendor.noDiscount}
          {result.ms ? ` · ${(result.ms / 1000).toFixed(1)} s` : ''}
        </>,
      );
    case 'unlinked':
      return box('yellow', <TriangleAlert size={24} />, t.vendor.unlinked(result.code), t.vendor.unlinkedSub, <QrImage value={result.url} size={150} />);
    case 'duplicate':
      return box('yellow', <TriangleAlert size={24} />, t.vendor.duplicate(result.code), t.vendor.duplicateSub);
    case 'unknown':
      return box(
        'red',
        <CircleAlert size={24} />,
        result.method === 'nfc' ? t.vendor.unknownNfc(result.value) : t.vendor.unknownQr(result.value),
        undefined,
        result.method === 'nfc' && (
          <button className="plain-btn" onClick={() => term.registerTag(result.value)}>
            {t.vendor.registerThis}
          </button>
        ),
      );
    case 'registered':
      return box(
        'blue',
        <Nfc size={24} />,
        result.created ? t.vendor.registered(result.code) : t.vendor.registeredExisting(result.code),
        t.vendor.registeredSub,
        <div className="stack center">
          <QrImage value={result.url} size={150} />
          {webNfcSupported() && (
            <button
              className="plain-btn"
              onClick={async () => {
                setWrite(t.vendor.writing);
                try {
                  await writeNfcUrl(result.url);
                  setWrite(t.vendor.written);
                } catch {
                  setWrite(t.errors.nfc_unavailable);
                }
              }}
            >
              {t.vendor.writeUrl}
            </button>
          )}
          {write && <span className="small">{write}</span>}
        </div>,
      );
    case 'voucher': {
      const title = (lang === 'vi' ? result.titleVi : result.titleEn) ?? result.code;
      if (result.status === 'voucher_ok') return box('purple', <Ticket size={24} />, t.vendor.voucherOk(title), `${result.code} · ${t.vendor.voucherOkSub}`);
      if (result.status === 'voucher_used') return box('yellow', <Ticket size={24} />, t.vendor.voucherUsed, `${result.code} · ${title}`);
      if (result.status === 'voucher_wrong_vendor') return box('red', <Ticket size={24} />, t.vendor.voucherWrongVendor(result.vendor ?? ''), `${result.code} · ${title}`);
      return box('red', <Ticket size={24} />, t.vendor.voucherInvalid, result.code);
    }
    case 'error':
      return box('red', <CircleAlert size={24} />, result.text);
  }
}
