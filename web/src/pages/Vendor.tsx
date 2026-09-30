import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtTime, fmtVnd, store, VENDOR_TOKEN } from '../api';
import { QrImage } from '../QrImage';
import { useKeyboardWedge, useNfcBridge, type WedgeBurst } from '../scan/hooks';
import { QrCamera } from '../scan/QrCamera';
import type { Detection } from '../scan/types';
import { calibrate, WEDGE_FORMATS, type WedgeFormat } from '../scan/uid';
import { startNfcScan, webNfcSupported, writeNfcUrl } from '../scan/webnfc';

type VendorInfo = { id: string; name: string; discountVnd: number };
type Settings = { usb: boolean; usbFormat: WedgeFormat; usbGapMs: number; bridge: boolean; bridgeUrl: string; timer: boolean };
type Result =
  | { kind: 'ok'; nickname: string; uses: number; discountVnd: number; method: string; ms: number | null }
  | { kind: 'unlinked'; code: string; url: string }
  | { kind: 'duplicate'; code: string }
  | { kind: 'unknown'; method: string; value: string }
  | { kind: 'registered'; code: string; url: string; created: boolean }
  | { kind: 'error'; text: string };

const SETTINGS_KEY = 'onecup.terminalSettings';
const DEFAULT_SETTINGS: Settings = { usb: true, usbFormat: 'dec-le', usbGapMs: 50, bridge: false, bridgeUrl: 'ws://localhost:7777', timer: false };

function loadSettings(): Settings {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(store.get(SETTINGS_KEY) ?? '{}') }; } catch { return DEFAULT_SETTINGS; }
}

function beep(ok: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = ok ? 880 : 220;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.35));
  } catch { /* audio blocked */ }
}

function useVendor() {
  const [token, setToken] = useState(() => store.get(VENDOR_TOKEN));
  const [vendor, setVendor] = useState<VendorInfo | null>(null);
  useEffect(() => {
    if (!token) return;
    api<VendorInfo>('/api/vendor/me', { token }).then(setVendor, () => { store.set(VENDOR_TOKEN, null); setToken(null); });
  }, [token]);
  const login = (t: string, v: VendorInfo) => { store.set(VENDOR_TOKEN, t); setToken(t); setVendor(v); };
  const logout = () => { store.set(VENDOR_TOKEN, null); setToken(null); setVendor(null); };
  return { token, vendor, login, logout };
}

function VendorLogin({ onLogin }: { onLogin: (t: string, v: VendorInfo) => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <main className="page">
      <form className="card" onSubmit={async (e) => {
        e.preventDefault();
        try { const r = await api('/api/vendor/login', { body: { pin } }); onLogin(r.token, r.vendor); } catch (err: any) { setError(err.message); }
      }}>
        <h1>Đăng nhập quầy</h1>
        <input inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Mã PIN quầy" autoFocus />
        {error && <p className="error">{error}</p>}
        <button>Vào terminal</button>
      </form>
    </main>
  );
}

export function Vendor() {
  const { token, vendor, login, logout } = useVendor();
  if (!token) return <VendorLogin onLogin={login} />;
  if (!vendor) return <main className="page"><p>Đang tải…</p></main>;
  return <Terminal token={token} vendor={vendor} logout={logout} />;
}

function Terminal({ token, vendor, logout }: { token: string; vendor: VendorInfo; logout: () => void }) {
  const [settings, setSettingsState] = useState<Settings>(loadSettings);
  const setSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch };
    setSettingsState(next);
    store.set(SETTINGS_KEY, JSON.stringify(next));
  };
  const [mode, setMode] = useState<'scan' | 'register'>('scan');
  const [camera, setCamera] = useState(false);
  const [webNfc, setWebNfc] = useState<'off' | 'on' | 'error'>('off');
  const stopNfc = useRef<(() => void) | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const busy = useRef(false);
  const [burst, setBurst] = useState<WedgeBurst | null>(null);

  const loadRecent = useCallback(() => api('/api/vendor/scans', { token }).then(setRecent, () => {}), [token]);
  useEffect(() => { loadRecent(); }, [loadRecent]);

  const registerTag = useCallback(async (uid: string) => {
    const r = await api('/api/vendor/tags', { token, body: { uid } });
    setResult({ kind: 'registered', code: r.cup.code, url: r.cup.url, created: r.created });
    beep(true);
  }, [token]);

  const handle = useCallback(async (d: Detection) => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (mode === 'register') {
        if (d.method !== 'nfc') { setResult({ kind: 'error', text: 'Chế độ đăng ký chỉ nhận thẻ NFC' }); beep(false); return; }
        await registerTag(d.value);
        return;
      }
      const ms = settings.timer && timerStart ? Math.round(performance.now() - timerStart) : null;
      const r = await api('/api/vendor/scans', { token, body: { method: d.method, source: d.source, value: d.value, txDurationMs: ms ?? undefined } });
      setTimerStart(null);
      if (r.status === 'ok') setResult({ kind: 'ok', nickname: r.user.nickname, uses: r.user.uses, discountVnd: r.discountVnd, method: d.method, ms });
      else if (r.status === 'unlinked') setResult({ kind: 'unlinked', code: r.cup.code, url: r.cup.url });
      else if (r.status === 'duplicate') setResult({ kind: 'duplicate', code: r.cup.code });
      else setResult({ kind: 'unknown', method: d.method, value: r.uid ?? d.value });
      beep(r.status === 'ok' || r.status === 'unlinked');
      loadRecent();
    } catch (e: any) {
      setResult({ kind: 'error', text: e.message });
      beep(false);
    } finally {
      setTimeout(() => { busy.current = false; }, 800);
    }
  }, [mode, token, settings.timer, timerStart, registerTag, loadRecent]);

  useKeyboardWedge(
    settings.usb,
    settings.usbFormat,
    handle,
    (raw) => setResult({ kind: 'error', text: `Reader USB gửi "${raw}" — không khớp định dạng ${settings.usbFormat}. Xem phần hiệu chỉnh bên dưới để chọn đúng định dạng.` }),
    setBurst,
    settings.usbGapMs,
  );
  const bridge = useNfcBridge(settings.bridge ? settings.bridgeUrl : null, handle);

  // Space bar = "new customer" when the H3 timer is enabled.
  useEffect(() => {
    if (!settings.timer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); setTimerStart(performance.now()); setResult(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [settings.timer]);

  async function toggleWebNfc() {
    if (stopNfc.current) { stopNfc.current(); stopNfc.current = null; setWebNfc('off'); return; }
    try {
      stopNfc.current = await startNfcScan(
        (r) => handle({ method: 'nfc', source: 'webnfc', value: r.uid, ndefUrl: r.url }),
        (err) => setResult({ kind: 'error', text: err }),
      );
      setWebNfc('on');
    } catch (e: any) {
      setWebNfc('error');
      setResult({ kind: 'error', text: `Web NFC: ${e.message}` });
    }
  }
  useEffect(() => () => stopNfc.current?.(), []);

  return (
    <main className="page wide">
      <header className="row between">
        <div>
          <h1>{vendor.name}</h1>
          <p className="muted small">Ưu đãi cho cốc đã liên kết: {fmtVnd(vendor.discountVnd)}</p>
        </div>
        <div className="row">
          <Link className="button secondary" to="/vendor/station">Màn hình mã quầy</Link>
          <button className="secondary" onClick={logout}>Đăng xuất</button>
        </div>
      </header>

      <div className="tabs">
        <button className={mode === 'scan' ? 'tab on' : 'tab'} onClick={() => { setMode('scan'); setResult(null); }}>Quét cốc</button>
        <button className={mode === 'register' ? 'tab on' : 'tab'} onClick={() => { setMode('register'); setResult(null); }}>Đăng ký thẻ NFC mới</button>
      </div>

      <section className="terminal">
        <div className="sources">
          <SourcePill label="USB reader" on={settings.usb} detail={settings.usb ? `đang nghe · ${settings.usbFormat}` : 'tắt'} />
          <SourcePill label="PC/SC bridge" on={bridge.state === 'connected'} detail={settings.bridge ? `${bridge.state}${bridge.readerName ? ` · ${bridge.readerName}` : ''}` : 'tắt'} />
          <SourcePill label="Web NFC" on={webNfc === 'on'} detail={webNfcSupported() ? webNfc : 'không hỗ trợ'} />
          <SourcePill label="Camera QR" on={camera} detail={camera ? 'đang mở' : 'tắt'} />
        </div>

        <div className="row wrap">
          {mode === 'scan' && <button className="secondary" onClick={() => setCamera(!camera)}>{camera ? 'Tắt camera' : 'Quét QR bằng camera'}</button>}
          {webNfcSupported() && <button className="secondary" onClick={toggleWebNfc}>{webNfc === 'on' ? 'Dừng Web NFC' : 'Bật Web NFC (chạm thẻ vào máy)'}</button>}
          {settings.timer && mode === 'scan' && (
            <button onClick={() => { setTimerStart(performance.now()); setResult(null); }}>
              {timerStart ? '⏱ Đang đo… (quét để dừng)' : 'Khách mới ▶ (phím Space)'}
            </button>
          )}
        </div>

        {camera && mode === 'scan' && <QrCamera onResult={(text) => handle({ method: 'qr', source: 'camera', value: text })} onClose={() => setCamera(false)} />}

        <ResultCard result={result} mode={mode} onRegister={registerTag} />

        <form className="row" onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem('manual') as HTMLInputElement;
          const v = input.value.trim();
          if (!v) return;
          // UIDs: anything with separators ("04:A2:…") or 7/10-byte hex; everything else is a cup code / QR payload.
          const isUid = mode === 'register' || /[:\- ]/.test(v) || /^([0-9A-Fa-f]{14}|[0-9A-Fa-f]{20})$/.test(v);
          handle(isUid ? { method: 'nfc', source: 'manual', value: v } : { method: 'qr', source: 'manual', value: v });
          input.value = '';
        }}>
          <input name="manual" placeholder={mode === 'register' ? 'Nhập UID thẻ, VD: 04:A2:3B:4C:5D:6E:7F' : 'Nhập mã cốc hoặc UID (khi không quét được)'} />
          <button className="secondary">Gửi</button>
        </form>
      </section>

      <WedgeCalibration burst={burst} format={settings.usbFormat} gapMs={settings.usbGapMs}
        onFormat={(usbFormat) => setSettings({ usbFormat })} onGap={(usbGapMs) => setSettings({ usbGapMs })} />

      <details className="card">
        <summary>Cài đặt thiết bị đọc</summary>
        <label className="check"><input type="checkbox" checked={settings.usb} onChange={(e) => setSettings({ usb: e.target.checked })} /><span>Nghe đầu đọc NFC USB kiểu bàn phím (keyboard wedge)</span></label>
        <label>Định dạng UID mà reader gõ ra
          <select value={settings.usbFormat} onChange={(e) => setSettings({ usbFormat: e.target.value as WedgeFormat })}>
            <option value="hex">HEX (VD: 04A23B4C5D6E7F)</option>
            <option value="dec-le">Thập phân 10 số, đảo byte (mặc định — đầu đọc của dự án gõ kiểu này)</option>
            <option value="dec-be">Thập phân 10 số, không đảo byte</option>
          </select>
        </label>
        <label className="check"><input type="checkbox" checked={settings.bridge} onChange={(e) => setSettings({ bridge: e.target.checked })} /><span>Kết nối PC/SC bridge (ACR122U… chạy <code>nfc-bridge</code> trên máy này)</span></label>
        <label>Địa chỉ bridge<input value={settings.bridgeUrl} onChange={(e) => setSettings({ bridgeUrl: e.target.value })} /></label>
        <label className="check"><input type="checkbox" checked={settings.timer} onChange={(e) => setSettings({ timer: e.target.checked })} /><span>Đo thời gian giao dịch (so sánh NFC vs QR — giả thuyết H3)</span></label>
      </details>

      <section className="card">
        <h2>Lượt quét gần đây</h2>
        <table>
          <thead><tr><th>Thời gian</th><th>Cốc</th><th>Người dùng</th><th>Cách</th><th>Thời gian GD</th></tr></thead>
          <tbody>
            {recent.map((s) => (
              <tr key={s.id}>
                <td>{fmtTime(s.created_at)}</td><td>{s.cup_code}</td><td>{s.nickname ?? '—'}</td>
                <td>{s.method.toUpperCase()} · {s.source}</td><td>{s.tx_duration_ms ? `${(s.tx_duration_ms / 1000).toFixed(1)} s` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

/**
 * Keyboard-wedge readers differ in what they type for the same tag. Show the raw string the reader
 * sent and what it means under each format; with the real UID (from a phone app) we can pick for you.
 */
function WedgeCalibration({ burst, format, gapMs, onFormat, onGap }: {
  burst: WedgeBurst | null; format: WedgeFormat; gapMs: number;
  onFormat: (f: WedgeFormat) => void; onGap: (ms: number) => void;
}) {
  const [realUid, setRealUid] = useState('');
  const rows = burst ? calibrate(burst.raw, realUid) : [];
  const box = useRef<HTMLDetailsElement>(null);
  // Open the panel by itself when the reader sends something the current format cannot read.
  useEffect(() => {
    if (burst && box.current && !rows.find((r) => r.format === format)?.hex) box.current.open = true;
  }, [burst]);
  const best = rows.find((r) => r.match === 'full') ?? rows.find((r) => r.match === 'prefix');
  return (
    <details className="card" ref={box}>
      <summary>Hiệu chỉnh đầu đọc USB (kiểu bàn phím)</summary>
      <p className="muted small">
        Chạm một thẻ vào đầu đọc (đừng bấm vào ô nhập nào). Nếu biết UID thật của thẻ — đọc bằng app <i>NFC Tools</i> trên điện thoại, dòng
        "Serial number" — nhập vào ô dưới để hệ thống tự chọn định dạng.
      </p>
      <label>UID thật của thẻ (không bắt buộc)
        <input value={realUid} onChange={(e) => setRealUid(e.target.value)} placeholder="VD: 04:A2:3B:4C:5D:6E:7F" />
      </label>
      {!burst && <p className="notice">Đang chờ đầu đọc gõ…</p>}
      {burst && (
        <>
          <p>
            Đầu đọc gửi: <code className="big">{burst.raw}</code>
            <br />
            <span className="muted small">{burst.raw.length} ký tự · kết thúc bằng {burst.terminator} · khoảng cách phím lớn nhất {burst.maxGapMs} ms</span>
          </p>
          <table>
            <thead><tr><th>Định dạng</th><th>UID hiểu được</th><th>So với UID thật</th><th></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.format}>
                  <td>{WEDGE_FORMATS.find((f) => f.id === r.format)!.label}</td>
                  <td><code>{r.hex ?? '— không hợp lệ'}</code></td>
                  <td>{realUid ? (r.match === 'full' ? '✔ khớp hoàn toàn' : r.match === 'prefix' ? '≈ khớp 4 byte đầu' : '✘') : ''}</td>
                  <td>{r.hex && (r.format === format ? <b>đang dùng</b> : <button className="small secondary" onClick={() => onFormat(r.format)}>Dùng</button>)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {best?.match === 'prefix' && (
            <p className="notice small">
              Đầu đọc chỉ gửi 4 byte của UID 7 byte. Vẫn dùng được, nhưng phải <b>đăng ký thẻ bằng chính loại đầu đọc này</b> ở quầy —
              không liên kết bằng cách chạm điện thoại Android (Web NFC đọc đủ 7 byte nên sẽ không khớp).
            </p>
          )}
        </>
      )}
      <label>Khoảng cách tối đa giữa 2 phím của đầu đọc (ms) — tăng lên nếu đầu đọc gõ chậm và không được nhận
        <input type="number" min={20} max={300} value={gapMs} onChange={(e) => onGap(Number(e.target.value) || 50)} />
      </label>
    </details>
  );
}

function SourcePill({ label, on, detail }: { label: string; on: boolean; detail: string }) {
  return <span className={on ? 'pill on' : 'pill'}><b>{label}</b> {detail}</span>;
}

function ResultCard({ result, mode, onRegister }: { result: Result | null; mode: 'scan' | 'register'; onRegister: (uid: string) => Promise<void> }) {
  const [writeState, setWriteState] = useState<string | null>(null);
  useEffect(() => setWriteState(null), [result]);

  if (!result) {
    return (
      <div className="result idle">
        {mode === 'scan' ? 'Sẵn sàng — chạm thẻ NFC hoặc quét mã QR trên cốc' : 'Chạm thẻ NFC mới vào đầu đọc để đăng ký'}
      </div>
    );
  }
  switch (result.kind) {
    case 'ok':
      return (
        <div className="result ok">
          <b className="big">✔ {result.nickname}</b>
          <span>Lần tái sử dụng thứ {result.uses} · {result.method.toUpperCase()}{result.ms ? ` · ${(result.ms / 1000).toFixed(1)} s` : ''}</span>
          {result.discountVnd > 0 && <b className="big">Giảm {fmtVnd(result.discountVnd)}</b>}
        </div>
      );
    case 'unlinked':
      return (
        <div className="result warn">
          <b>Cốc chưa liên kết tài khoản — đã ghi nhận lượt dùng, chưa áp dụng ưu đãi.</b>
          <span>Mời khách quét mã này bằng điện thoại để liên kết (mã cốc: <b>{result.code}</b>)</span>
          <QrImage value={result.url} size={160} />
        </div>
      );
    case 'duplicate':
      return <div className="result warn"><b>Cốc {result.code} vừa được quét</b><span>Không ghi nhận trùng.</span></div>;
    case 'unknown':
      return (
        <div className="result bad">
          <b>Không nhận ra {result.method === 'nfc' ? `thẻ NFC ${result.value}` : `mã "${result.value}"`}</b>
          {result.method === 'nfc' && <button onClick={() => onRegister(result.value)}>Đăng ký thẻ này</button>}
        </div>
      );
    case 'registered':
      return (
        <div className="result ok">
          <b>{result.created ? 'Đã đăng ký thẻ mới' : 'Thẻ này đã có trong hệ thống'} · mã nhận: <span className="big">{result.code}</span></b>
          <span>Khách quét mã QR này (hoặc nhập mã nhận) trong ứng dụng để liên kết thẻ với tài khoản.</span>
          <QrImage value={result.url} size={160} />
          {webNfcSupported() && (
            <button className="secondary" onClick={async () => {
              setWriteState('Chạm lại thẻ để ghi URL…');
              try { await writeNfcUrl(result.url); setWriteState('Đã ghi URL vào thẻ ✔'); } catch (e: any) { setWriteState(`Lỗi ghi: ${e.message}`); }
            }}>Ghi URL vào thẻ (Web NFC)</button>
          )}
          {writeState && <span>{writeState}</span>}
        </div>
      );
    case 'error':
      return <div className="result bad"><b>{result.text}</b></div>;
  }
}

/** Station display (tier 2): a rotating QR the student scans with their own phone. */
export function Station() {
  const { token, vendor } = useVendor();
  const [data, setData] = useState<{ code: string; expiresAt: number; url: string } | null>(null);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!token) return;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const d = await api('/api/vendor/station-code', { token });
        setData(d);
        timer = setTimeout(load, Math.max(1000, d.expiresAt - Date.now() + 200));
      } catch {
        timer = setTimeout(load, 5000);
      }
    };
    load();
    return () => clearTimeout(timer);
  }, [token]);

  useEffect(() => {
    const t = setInterval(() => setLeft(data ? Math.max(0, Math.ceil((data.expiresAt - Date.now()) / 1000)) : 0), 250);
    return () => clearInterval(t);
  }, [data]);

  if (!token) return <main className="page"><p>Cần <Link to="/vendor">đăng nhập quầy</Link> trước.</p></main>;
  return (
    <main className="page center station">
      <h1>{vendor?.name ?? ''}</h1>
      <p>Dùng cốc tái sử dụng? Quét mã bằng điện thoại để được ghi nhận</p>
      {data && <QrImage value={data.url} size={320} />}
      {data && <p className="code">{data.code}</p>}
      <p className="muted">Mã đổi sau {left} s</p>
      <Link to="/vendor" className="muted small">← Terminal</Link>
    </main>
  );
}
