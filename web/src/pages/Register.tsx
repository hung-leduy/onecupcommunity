import { useState } from 'react';
import { api, store, USER_TOKEN, type Me } from '../api';

export function Register({ onDone }: { onDone: (token: string, me: Me) => void }) {
  const [nickname, setNickname] = useState('');
  const [participate, setParticipate] = useState(false);
  const [research, setResearch] = useState(false);
  const [method, setMethod] = useState<'' | 'qr' | 'nfc'>('');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api<Me & { token: string }>('/api/users', {
        body: { nickname, consentParticipate: participate, consentResearch: research, preferredMethod: method || null },
      });
      store.set(USER_TOKEN, r.token);
      onDone(r.token, r);
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <form className="card" onSubmit={submit}>
      <h2>Tham gia One-Cup</h2>
      <label>
        Biệt danh (không bắt buộc — không dùng tên thật)
        <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} placeholder="VD: CàPhêXanh" />
      </label>
      <label>
        Bạn định dùng
        <select value={method} onChange={(e) => setMethod(e.target.value as any)}>
          <option value="">Chưa biết</option>
          <option value="qr">Cốc VGU có mã QR</option>
          <option value="nfc">Bình cá nhân gắn thẻ NFC</option>
        </select>
      </label>
      <label className="check">
        <input type="checkbox" checked={participate} onChange={(e) => setParticipate(e.target.checked)} />
        <span>Tôi đồng ý tham gia chương trình. Ứng dụng ghi lại các lần tôi dùng cốc tái sử dụng để hiển thị tác động và áp dụng ưu đãi.</span>
      </label>
      <label className="check">
        <input type="checkbox" checked={research} onChange={(e) => setResearch(e.target.checked)} />
        <span>(Tuỳ chọn) Cho phép đưa dữ liệu đã ẩn danh của tôi vào bộ dữ liệu nghiên cứu. Có thể thay đổi bất cứ lúc nào.</span>
      </label>
      {error && <p className="error">{error}</p>}
      <button disabled={!participate}>Bắt đầu</button>
      <p className="muted small">Tài khoản được lưu trên thiết bị này. Bạn có thể xuất hoặc xoá dữ liệu của mình trong phần Cài đặt.</p>
    </form>
  );
}
