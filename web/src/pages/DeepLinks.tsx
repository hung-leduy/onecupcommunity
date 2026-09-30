import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Cup, type Me } from '../api';
import { useMe } from '../useMe';
import { Register } from './Register';

/** /c/:code — opened by scanning a cup's QR with the phone camera or tapping its NFC tag. */
export function CupDeepLink() {
  const { code = '' } = useParams();
  const { token, me, setMe, loading, signIn } = useMe();
  const [cup, setCup] = useState<(Cup & { mine: boolean }) | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    api(`/api/cups/${code}`, { token }).then(setCup, (e) => setMsg({ ok: false, text: e.message }));
  }, [code, token, me?.cups.length]);

  if (loading) return <main className="page"><p>Đang tải…</p></main>;
  if (!token || !me) {
    return (
      <main className="page">
        <p className="notice">Bạn vừa quét cốc <b>{code.toUpperCase()}</b>. Đăng ký để liên kết cốc này.</p>
        <Register onDone={signIn} />
      </main>
    );
  }

  const run = async (fn: () => Promise<Me>, text: string) => {
    try { setMe(await fn()); setMsg({ ok: true, text }); } catch (e: any) { setMsg({ ok: false, text: e.message }); }
  };

  return (
    <main className="page">
      <h1>Cốc {code.toUpperCase()}</h1>
      {msg && <p className={msg.ok ? 'notice' : 'error'}>{msg.text}</p>}
      {cup && !cup.linked && (
        <button onClick={() => run(() => api('/api/me/cups', { token, body: { code } }), 'Đã liên kết cốc vào tài khoản!')}>
          Liên kết cốc này với tài khoản của tôi
        </button>
      )}
      {cup?.mine && (
        <button onClick={() => run(async () => api('/api/me/scans/self', { token, body: { cupId: cup.id } }), 'Đã ghi nhận lần dùng (chưa xác thực). Lần sau hãy để quầy quét để được ưu đãi!')}>
          Tôi vừa dùng cốc này
        </button>
      )}
      {cup && cup.linked && !cup.mine && <p className="error">Cốc này thuộc về người dùng khác.</p>}
      <p><Link to="/me">← Về trang của tôi</Link></p>
    </main>
  );
}

/** /s/:vendorId/:code — rotating station code (tier 2), scanned from the station screen. */
export function StationDeepLink() {
  const { vendorId = '', code = '' } = useParams();
  const { token, me, loading, signIn } = useMe();
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [cupId, setCupId] = useState<string>('');
  const sent = useRef(false);

  const submit = async (id: string) => {
    try {
      const r = await api('/api/me/scans/station', { token, body: { vendorId, code, cupId: id } });
      setResult({ ok: true, text: `Đã ghi nhận tại ${r.vendor.name} ✔ (xác thực)` });
    } catch (e: any) {
      setResult({ ok: false, text: e.message });
    }
  };

  // With exactly one cup, submit immediately — the code is only valid for about a minute.
  useEffect(() => {
    if (me && me.cups.length === 1 && !sent.current) {
      sent.current = true;
      submit(me.cups[0].id);
    }
  }, [me]);

  if (loading) return <main className="page"><p>Đang tải…</p></main>;
  if (!token || !me) return <main className="page"><Register onDone={signIn} /></main>;

  return (
    <main className="page">
      <h1>Ghi nhận tại quầy</h1>
      {result && <p className={result.ok ? 'notice big' : 'error'}>{result.text}</p>}
      {me.cups.length === 0 && <p className="error">Bạn chưa liên kết cốc nào. <Link to="/me">Thêm cốc</Link></p>}
      {me.cups.length > 1 && !result?.ok && (
        <div className="stack">
          <p>Bạn đang dùng cốc nào?</p>
          <select value={cupId} onChange={(e) => setCupId(e.target.value)}>
            <option value="">— chọn cốc —</option>
            {me.cups.map((c) => <option key={c.id} value={c.id}>{c.kind.toUpperCase()} · {c.code}</option>)}
          </select>
          <button disabled={!cupId} onClick={() => submit(cupId)}>Xác nhận</button>
        </div>
      )}
      <p><Link to="/me">← Về trang của tôi</Link></p>
    </main>
  );
}
