import { ChartColumn, CircleHelp, ScanLine, Store } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api';
import { errorText, LangSwitch, useI18n } from '../i18n';
import { Btn3D } from '../ui/kit';
import { TerminalProvider, useTerminal, useVendorSession, type Vendor } from './terminal';
import '../styles/vendor.css';

export function VendorApp() {
  const { token, vendor, login, logout } = useVendorSession();
  const { t } = useI18n();
  if (!token) return <VendorLogin onLogin={login} />;
  if (!vendor)
    return (
      <div className="vd-app">
        <p className="muted center" style={{ padding: 40 }}>
          {t.common.loading}
        </p>
      </div>
    );
  return (
    <TerminalProvider token={token} vendor={vendor} logout={logout}>
      <VendorLayout />
    </TerminalProvider>
  );
}

function VendorLayout() {
  const { vendor, staff } = useTerminal();
  const { t } = useI18n();
  const sub = [vendor.stationLabel, staff].filter(Boolean).join(' · ');
  return (
    <div className="vd-app">
      <header className="vd-header">
        <span className="vd-header__icon">
          <Store size={24} />
        </span>
        <div className="grow">
          <h1>{vendor.name}</h1>
          {sub && <p>{sub}</p>}
        </div>
        <span className="vd-badge">{t.vendor.badge}</span>
      </header>
      <main className="vd-main">
        <Outlet />
      </main>
      <nav className="vd-tabs">
        <NavLink to="/vendor" end>
          <i>
            <ScanLine size={24} />
          </i>
          {t.vendor.tabs.scan}
        </NavLink>
        <NavLink to="/vendor/today">
          <i>
            <ChartColumn size={24} />
          </i>
          {t.vendor.tabs.today}
        </NavLink>
        <NavLink to="/vendor/help">
          <i>
            <CircleHelp size={24} />
          </i>
          {t.vendor.tabs.help}
        </NavLink>
      </nav>
    </div>
  );
}

function VendorLogin({ onLogin }: { onLogin: (token: string, v: Vendor, staff: string) => void }) {
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const [staff, setStaff] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="vd-app">
      <header className="vd-header">
        <span className="vd-header__icon">
          <Store size={24} />
        </span>
        <div className="grow">
          <h1>{t.vendor.signIn}</h1>
        </div>
        <LangSwitch className="on-blue" />
      </header>
      <main className="vd-main">
        <form
          className="card stack"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              const r = await api<{ token: string; vendor: Vendor }>('/api/vendor/login', { body: { pin } });
              onLogin(r.token, r.vendor, staff.trim());
            } catch (err) {
              setError(errorText(t, err));
            }
          }}
        >
          <label className="field">
            {t.vendor.pin}
            <input inputMode="numeric" autoComplete="off" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} autoFocus />
          </label>
          <label className="field">
            {t.vendor.staff}
            <input value={staff} maxLength={40} onChange={(e) => setStaff(e.target.value)} />
          </label>
          {error && <p className="error-box">{error}</p>}
          <Btn3D tone="blue" className="block" disabled={pin.length < 4}>
            {t.vendor.start}
          </Btn3D>
        </form>
      </main>
    </div>
  );
}
