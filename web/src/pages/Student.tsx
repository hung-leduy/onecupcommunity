import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, fmtTime, fmtVnd, tierLabel, type Me } from '../api';
import { QrImage } from '../QrImage';
import { QrCamera } from '../scan/QrCamera';
import { startNfcScan, webNfcSupported } from '../scan/webnfc';
import { useMe } from '../useMe';
import { Register } from './Register';

export function Student() {
  const { token, me, setMe, loading, signIn, signOut } = useMe();
  if (loading) return <main className="page"><p>Đang tải…</p></main>;
  if (!token || !me) return <main className="page"><Register onDone={signIn} /></main>;
  return <Dashboard token={token} me={me} setMe={setMe} signOut={signOut} />;
}

function Dashboard({ token, me, setMe, signOut }: { token: string; me: Me; setMe: (m: Me) => void; signOut: () => void }) {
  const navigate = useNavigate();
  const [panel, setPanel] = useState<null | 'link' | 'station'>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showCup, setShowCup] = useState<string | null>(null);

  const act = async (fn: () => Promise<Me>, okText: string) => {
    try {
      setMe(await fn());
      setMsg({ ok: true, text: okText });
      setPanel(null);
    } catch (e: any) {
      setMsg({ ok: false, text: e.message });
    }
  };

  const linkCode = (code: string) => act(() => api('/api/me/cups', { token, body: { code } }), 'Đã liên kết cốc!');
  const linkNfc = (nfcUid: string) => act(() => api('/api/me/cups', { token, body: { nfcUid } }), 'Đã liên kết thẻ NFC!');

  async function tapToLink() {
    setMsg({ ok: true, text: 'Chạm thẻ NFC vào mặt sau điện thoại…' });
    try {
      const stop = await startNfcScan(
        (r) => { stop(); linkNfc(r.uid); },
        (err) => setMsg({ ok: false, text: err }),
      );
    } catch (e: any) {
      setMsg({ ok: false, text: `Không bật được NFC: ${e.message}` });
    }
  }

  function onStationQr(text: string) {
    // Station screens show "<origin>/s/<vendorId>/<code>"; open it inside the app.
    const m = text.match(/\/s\/([^/]+)\/([A-Za-z0-9]+)/);
    if (m) navigate(`/s/${m[1]}/${m[2]}`);
    else setMsg({ ok: false, text: 'Đây không phải mã quầy One-Cup' });
  }

  function onLinkQr(text: string) {
    linkCode(text);
  }

  const settings = {
    toggleResearch: () => act(() => api('/api/me', { token, method: 'PATCH', body: { consentResearch: !me.user.consentResearch } }), 'Đã cập nhật lựa chọn.'),
    exportData: async () => {
      const data = await api('/api/me/export', { token });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = 'onecup-du-lieu-cua-toi.json';
      a.click();
    },
    deleteAll: async () => {
      if (!confirm('Xoá vĩnh viễn tài khoản và toàn bộ lịch sử? Cốc sẽ được gỡ liên kết.')) return;
      await api('/api/me', { token, method: 'DELETE' });
      signOut();
    },
  };

  return (
    <main className="page">
      <header className="row between">
        <h1>Chào {me.user.nickname}</h1>
      </header>

      {msg && <p className={msg.ok ? 'notice' : 'error'}>{msg.text}</p>}

      <section className="stats">
        <div className="stat"><b>{me.uses.total}</b><span>lần tái sử dụng</span></div>
        {me.impact && (
          <>
            <div className="stat"><b>{me.impact.plasticGrams.toLocaleString('vi-VN')} g</b><span>nhựa tránh được</span></div>
            <div className="stat"><b>{(me.impact.co2eGrams / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 2 })} kg</b><span>CO₂e giảm</span></div>
          </>
        )}
      </section>
      {me.impact && <p className="muted small">Số liệu ước tính theo hệ số trung bình mỗi cốc dùng một lần; {me.uses.verified} lần đã được quầy xác thực.</p>}

      {me.badges && (
        <section className="badges">
          {me.badges.map((b) => <span key={b.id} className={b.earned ? 'badge on' : 'badge'}>{b.earned ? '🏅' : '○'} {b.label}</span>)}
        </section>
      )}

      <section className="card">
        <div className="row between">
          <h2>Cốc của tôi</h2>
          <button className="secondary" onClick={() => setPanel(panel === 'link' ? null : 'link')}>+ Thêm cốc</button>
        </div>
        {panel === 'link' && (
          <div className="stack">
            <p>Quét mã QR trên cốc, nhập mã in trên cốc / mã nhận thẻ do quầy cung cấp, hoặc chạm thẻ NFC.</p>
            <QrCamera onResult={onLinkQr} />
            <form className="row" onSubmit={(e) => { e.preventDefault(); linkCode(String(new FormData(e.currentTarget).get('code'))); }}>
              <input name="code" placeholder="Mã cốc, VD: 7KQ2M9XA" autoCapitalize="characters" />
              <button>Liên kết</button>
            </form>
            {webNfcSupported() && <button className="secondary" onClick={tapToLink}>Chạm thẻ NFC để liên kết</button>}
          </div>
        )}
        {me.cups.length === 0 && <p className="muted">Chưa có cốc nào. Hãy thêm cốc để bắt đầu.</p>}
        <ul className="list">
          {me.cups.map((c) => (
            <li key={c.id}>
              <div className="row between">
                <span><b>{c.kind === 'nfc' ? '📶 NFC' : '▦ QR'}</b> {c.code}</span>
                <span className="row">
                  <button className="secondary small" onClick={() => setShowCup(showCup === c.id ? null : c.id)}>Mã</button>
                  <button className="small" onClick={() => act(async () => (await api('/api/me/scans/self', { token, body: { cupId: c.id } })), 'Đã ghi nhận (chưa xác thực).')}>Tôi vừa dùng cốc</button>
                </span>
              </div>
              {showCup === c.id && (
                <div className="center stack">
                  <QrImage value={c.url} size={180} />
                  <p className="muted small">Đưa mã này cho quầy quét nếu mã trên cốc bị mờ.</p>
                  <button className="link-btn" onClick={() => confirm('Gỡ liên kết cốc này?') && act(() => api(`/api/me/cups/${c.id}`, { token, method: 'DELETE' }), 'Đã gỡ cốc.')}>Gỡ liên kết</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Quét mã tại quầy</h2>
          <button className="secondary" onClick={() => setPanel(panel === 'station' ? null : 'station')}>{panel === 'station' ? 'Đóng' : 'Mở camera'}</button>
        </div>
        <p className="muted small">Ở quầy có màn hình mã QR đổi liên tục — quét mã đó để được ghi nhận có xác thực.</p>
        {panel === 'station' && <QrCamera onResult={onStationQr} />}
      </section>

      <section className="card">
        <h2>Lịch sử gần đây</h2>
        {me.recent.length === 0 && <p className="muted">Chưa có lượt nào.</p>}
        <ul className="list small">
          {me.recent.map((s) => (
            <li key={s.id} className="row between">
              <span>{fmtTime(s.created_at)} · {s.vendor_name ?? 'Tự quét'} · {s.method.toUpperCase()}</span>
              <span className={s.verified ? 'ok' : 'muted'}>{tierLabel(s.tier)}{s.discount_vnd && me.features.rewards ? ` · −${fmtVnd(s.discount_vnd)}` : ''}</span>
            </li>
          ))}
        </ul>
      </section>

      <details className="card">
        <summary>Cài đặt & quyền riêng tư</summary>
        <label className="check">
          <input type="checkbox" checked={me.user.consentResearch} onChange={settings.toggleResearch} />
          <span>Cho phép dùng dữ liệu ẩn danh của tôi cho nghiên cứu</span>
        </label>
        <div className="row">
          <button className="secondary" onClick={settings.exportData}>Xuất dữ liệu của tôi</button>
          <button className="danger" onClick={settings.deleteAll}>Xoá tài khoản</button>
        </div>
      </details>
    </main>
  );
}
