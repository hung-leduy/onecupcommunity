import { ChartColumn, Database, Download, LogOut, QrCode, Shield, Store, Users } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { ADMIN_KEY, api, ApiError } from '../api';
import { errorText, LangSwitch, useI18n } from '../i18n';
import { CupIcon } from '../ui/icons';
import { Btn3D } from '../ui/kit';
import { Overview } from './Overview';
import { ArmsPage, CupsPage, ExportPage, ParticipantsPage, QualityPage, VendorsPage } from './Pages';

export { PrintLabels } from './Pages';
import '../styles/console.css';

export type Settings = { pilotStart: string; pilotWeeks: number; studyEnd: string; rewardsEnd: string; clusterStarts: Record<string, number>; demo: boolean };

const session = {
  get: () => {
    try {
      return sessionStorage.getItem(ADMIN_KEY);
    } catch {
      return null;
    }
  },
  set: (v: string | null) => {
    try {
      if (v === null) sessionStorage.removeItem(ADMIN_KEY);
      else sessionStorage.setItem(ADMIN_KEY, v);
    } catch {
      /* ignore */
    }
  },
};

type AdminCtx = {
  key: string;
  settings: Settings | null;
  reloadSettings: () => void;
  call: <T = any>(path: string, opts?: { body?: unknown; method?: string }) => Promise<T>;
};
const Ctx = createContext<AdminCtx | null>(null);
export const useAdmin = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAdmin outside ConsoleApp');
  return c;
};

/** Pilot week of today (Viet Nam time) for a pilot that starts on `start`. */
export function pilotWeek(start: string): number {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const days = Math.round((Date.parse(today) - Date.parse(start)) / 86_400_000);
  return days < 0 ? 0 : Math.floor(days / 7) + 1;
}

export function ConsoleApp() {
  const { t } = useI18n();
  const [key, setKey] = useState<string | null>(session.get);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signOut = useCallback(() => {
    session.set(null);
    setKey(null);
    setSettings(null);
  }, []);

  const call = useCallback(
    async <T,>(path: string, opts: { body?: unknown; method?: string } = {}) => {
      try {
        return await api<T>(path, { admin: key, ...opts });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) signOut();
        throw e;
      }
    },
    [key, signOut],
  );

  const reloadSettings = useCallback(() => {
    if (key) call<Settings>('/api/admin/settings').then(setSettings, (e) => setError(errorText(t, e)));
  }, [key, call, t]);
  useEffect(reloadSettings, [reloadSettings]);

  if (!key) return <Login onKey={(k) => (session.set(k), setKey(k), setError(null))} error={error} />;

  return (
    <Ctx.Provider value={{ key, settings, reloadSettings, call }}>
      <div className="cs-app">
        <Sidebar settings={settings} onSignOut={signOut} />
        <main className="cs-main">
          <Routes>
            <Route index element={<Overview />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="participants" element={<ParticipantsPage />} />
            <Route path="arms" element={<ArmsPage />} />
            <Route path="quality" element={<QualityPage />} />
            <Route path="export" element={<ExportPage />} />
            <Route path="cups" element={<CupsPage />} />
          </Routes>
        </main>
      </div>
    </Ctx.Provider>
  );
}

function Sidebar({ settings, onSignOut }: { settings: Settings | null; onSignOut: () => void }) {
  const { t, f } = useI18n();
  const n = t.console.nav;
  const items: [string, ReactNode, string][] = [
    ['/admin', <ChartColumn size={22} />, n.overview],
    ['/admin/vendors', <Store size={22} />, n.vendors],
    ['/admin/participants', <Users size={22} />, n.participants],
    ['/admin/arms', <Shield size={22} />, n.arms],
    ['/admin/quality', <Database size={22} />, n.quality],
    ['/admin/export', <Download size={22} />, n.export],
    ['/admin/cups', <QrCode size={22} />, n.cups],
  ];
  const week = settings ? pilotWeek(settings.pilotStart) : 0;
  return (
    <aside className="cs-side">
      <div className="cs-brand">
        <span className="cs-brand__logo">
          <CupIcon size={26} />
        </span>
        <div>
          <b>One-Cup</b>
          <span>{t.console.brand}</span>
        </div>
      </div>
      <nav className="cs-nav">
        {items.map(([to, icon, label]) => (
          <NavLink key={to} to={to} end={to === '/admin'}>
            {icon}
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="cs-side__foot">
        {settings && (
          <p>
            {week < 1 ? t.console.before : week > settings.pilotWeeks ? t.console.after : t.console.week(week, settings.pilotWeeks)}
            <br />
            {t.console.lock(f.date(settings.studyEnd))}
          </p>
        )}
        <div className="row between">
          <LangSwitch className="on-dark" />
          <button className="cs-signout" onClick={onSignOut}>
            <LogOut size={16} /> {t.console.signOut}
          </button>
        </div>
      </div>
    </aside>
  );
}

function Login({ onKey, error }: { onKey: (k: string) => void; error: string | null }) {
  const { t } = useI18n();
  const [value, setValue] = useState('');
  return (
    <div className="cs-login">
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          onKey(value);
        }}
      >
        <div className="cs-brand dark">
          <span className="cs-brand__logo">
            <CupIcon size={26} />
          </span>
          <div>
            <b>One-Cup</b>
            <span>{t.console.brand}</span>
          </div>
          <LangSwitch />
        </div>
        <label className="field">
          {t.console.adminKey}
          <input type="password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
        </label>
        {error && <p className="error-box">{error}</p>}
        <Btn3D className="block" disabled={!value}>
          {t.console.login}
        </Btn3D>
      </form>
    </div>
  );
}
