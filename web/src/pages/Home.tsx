import { Link } from 'react-router-dom';
import { webNfcSupported } from '../scan/webnfc';

export function Home() {
  return (
    <main className="page">
      <header className="hero">
        <img src="/icon.svg" width={56} height={56} alt="" />
        <div>
          <h1>One-Cup-Community</h1>
          <p className="muted">Mỗi lần dùng lại cốc là một cốc nhựa được tránh.</p>
        </div>
      </header>
      <div className="cards">
        <Link className="card link" to="/me">
          <h2>Sinh viên / Cán bộ</h2>
          <p>Đăng ký, liên kết cốc QR hoặc thẻ NFC, xem tác động của bạn.</p>
        </Link>
        <Link className="card link" to="/vendor">
          <h2>Quầy bán hàng</h2>
          <p>Terminal quét cốc: camera QR, Web NFC, đầu đọc NFC USB.</p>
        </Link>
        <Link className="card link" to="/admin">
          <h2>Quản trị</h2>
          <p>Thống kê, tạo mã cốc QR, quầy, xuất dữ liệu nghiên cứu.</p>
        </Link>
      </div>
      <p className="muted small">
        Thiết bị này {webNfcSupported() ? 'hỗ trợ' : 'không hỗ trợ'} Web NFC
        {window.isSecureContext ? '' : ' · ⚠ không phải HTTPS: camera và NFC sẽ không hoạt động'}.
      </p>
    </main>
  );
}
