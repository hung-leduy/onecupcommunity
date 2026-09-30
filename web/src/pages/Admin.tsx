import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ADMIN_KEY, api, fmtTime, type Cup } from '../api';
import { QrImage } from '../QrImage';

const session = {
  get: () => { try { return sessionStorage.getItem(ADMIN_KEY); } catch { return null; } },
  set: (v: string) => { try { sessionStorage.setItem(ADMIN_KEY, v); } catch { /* ignore */ } },
};

export function Admin() {
  const [key, setKey] = useState(session.get);
  const [stats, setStats] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [cups, setCups] = useState<Cup[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!key) return;
    try {
      const [s, v, c] = await Promise.all([
        api('/api/admin/stats', { admin: key }),
        api('/api/admin/vendors', { admin: key }),
        api<Cup[]>('/api/admin/cups', { admin: key }),
      ]);
      setStats(s); setVendors(v); setCups(c); setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [key]);
  useEffect(() => { load(); }, [load]);

  if (!key || (error && !stats)) {
    return (
      <main className="page">
        <form className="card" onSubmit={(e) => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('key')); session.set(v); setKey(v); }}>
          <h1>Quản trị</h1>
          <input name="key" type="password" placeholder="Admin key (biến môi trường ADMIN_KEY)" autoFocus />
          {error && <p className="error">{error}</p>}
          <button>Vào</button>
        </form>
      </main>
    );
  }
  if (!stats) return <main className="page"><p>Đang tải…</p></main>;

  const t = stats.totals;
  const download = async () => {
    const res = await fetch('/api/admin/export.csv', { headers: { 'x-admin-key': key } });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = `onecup-scans-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <main className="page wide">
      <header className="row between">
        <h1>Quản trị One-Cup</h1>
        <div className="row">
          <button className="secondary" onClick={load}>Làm mới</button>
          <button onClick={download}>Xuất CSV nghiên cứu</button>
        </div>
      </header>

      <section className="stats">
        <div className="stat"><b>{t.users}</b><span>người dùng</span></div>
        <div className="stat"><b>{t.linked_cups}/{t.cups}</b><span>cốc đã liên kết</span></div>
        <div className="stat"><b>{t.verified_scans}</b><span>lượt xác thực</span></div>
        <div className="stat"><b>{t.unverified_scans}</b><span>lượt tự quét</span></div>
        <div className="stat"><b>{(stats.impact.plasticGrams / 1000).toFixed(2)} kg</b><span>nhựa tránh được*</span></div>
        <div className="stat"><b>{(stats.impact.co2eGrams / 1000).toFixed(2)} kg</b><span>CO₂e*</span></div>
      </section>
      <p className="muted small">* Chỉ tính lượt xác thực; hệ số tạm {stats.impactCoefficients.plasticGramsPerCup} g nhựa và {stats.impactCoefficients.co2eGramsPerCup} g CO₂e mỗi cốc — cần thay bằng số liệu LCA.</p>

      <section className="card">
        <h2>H3 — Giao dịch tại quầy theo công nghệ</h2>
        <table>
          <thead><tr><th>Công nghệ</th><th>Thiết bị</th><th>Lượt</th><th>Có đo giờ</th><th>TB (s)</th><th>Min</th><th>Max</th></tr></thead>
          <tbody>
            {stats.counterByMethod.map((r: any) => (
              <tr key={r.method + r.source}>
                <td>{r.method.toUpperCase()}</td><td>{r.source}</td><td>{r.scans}</td><td>{r.timed}</td>
                <td>{r.avg_tx_ms ? (r.avg_tx_ms / 1000).toFixed(1) : '—'}</td>
                <td>{r.min_tx_ms ? (r.min_tx_ms / 1000).toFixed(1) : '—'}</td>
                <td>{r.max_tx_ms ? (r.max_tx_ms / 1000).toFixed(1) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="grid2">
        <section className="card">
          <h2>Theo ngày</h2>
          <table><thead><tr><th>Ngày</th><th>Xác thực</th><th>Tự quét</th></tr></thead>
            <tbody>{stats.byDay.map((d: any) => <tr key={d.day}><td>{d.day}</td><td>{d.verified}</td><td>{d.unverified}</td></tr>)}</tbody>
          </table>
        </section>
        <section className="card">
          <h2>Nhóm thực nghiệm (H2)</h2>
          <table><thead><tr><th>Nhóm</th><th>Người dùng</th></tr></thead>
            <tbody>{stats.arms.map((a: any) => <tr key={a.arm}><td>{a.arm}</td><td>{a.users}</td></tr>)}</tbody>
          </table>
        </section>
      </div>

      <section className="card">
        <h2>Quầy</h2>
        <table><thead><tr><th>Tên</th><th>PIN</th><th>Ưu đãi</th><th>Lượt xác thực</th></tr></thead>
          <tbody>{vendors.map((v) => (
            <tr key={v.id}><td>{v.name}</td><td>{v.pin}</td><td>{v.discount_vnd.toLocaleString('vi-VN')} ₫</td>
              <td>{stats.byVendor.find((b: any) => b.name === v.name)?.verified_scans ?? 0}</td></tr>
          ))}</tbody>
        </table>
        <form className="row wrap" onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            await api('/api/admin/vendors', { admin: key, body: { name: f.get('name'), pin: f.get('pin'), discountVnd: Number(f.get('discount') || 0) } });
            e.currentTarget.reset();
            load();
          } catch (err: any) { alert(err.message); }
        }}>
          <input name="name" placeholder="Tên quầy" required />
          <input name="pin" placeholder="PIN 4–8 số" inputMode="numeric" required />
          <input name="discount" placeholder="Ưu đãi (VND)" inputMode="numeric" />
          <button>Thêm quầy</button>
        </form>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Cốc ({cups.length})</h2>
          <form className="row" onSubmit={async (e) => {
            e.preventDefault();
            await api('/api/admin/cups', { admin: key, body: { count: Number(new FormData(e.currentTarget).get('count')) } });
            load();
          }}>
            <input name="count" type="number" min={1} max={500} defaultValue={10} style={{ width: 80 }} />
            <button>Tạo mã cốc QR</button>
          </form>
        </div>
        <p><Link to={`/admin/print?codes=${cups.filter((c) => c.kind === 'qr' && !c.linked).map((c) => c.code).join(',')}`}>In tờ mã QR cho các cốc chưa liên kết →</Link></p>
        <table><thead><tr><th>Mã</th><th>Loại</th><th>UID NFC</th><th>Liên kết</th><th>Tạo lúc</th></tr></thead>
          <tbody>{cups.slice(0, 200).map((c: any) => (
            <tr key={c.id}><td>{c.code}</td><td>{c.kind}</td><td>{c.nfcUid ?? ''}</td><td>{c.linked ? '✔' : ''}</td><td>{fmtTime(c.createdAt)}</td></tr>
          ))}</tbody>
        </table>
      </section>
    </main>
  );
}

/** Printable sheet of QR labels (for laser engraving or sticker printing). */
export function PrintCups() {
  const [params] = useSearchParams();
  const codes = (params.get('codes') ?? '').split(',').filter(Boolean);
  const origin = window.location.origin;
  return (
    <main className="print">
      <p className="no-print">{codes.length} mã · Ctrl+P để in. URL trong QR dùng địa chỉ trang hiện tại ({origin}) — hãy mở trang này từ tên miền chính thức trước khi in.</p>
      <div className="labels">
        {codes.map((code) => (
          <div key={code} className="label">
            <QrImage value={`${origin}/c/${code}`} size={110} />
            <span>{code}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
