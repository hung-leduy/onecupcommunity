import { Crown, Flag, House, Store, User } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import { Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n';
import { lastSeen, markSeen, useSession } from './session';

const TABS = [
  { to: '/me', icon: House, key: 'home', tone: 'green', end: true },
  { to: '/me/journey', icon: Flag, key: 'journey', tone: 'blue', feature: 'gamification' },
  { to: '/me/league', icon: Crown, key: 'league', tone: 'yellow', feature: 'gamification' },
  { to: '/me/rewards', icon: Store, key: 'rewards', tone: 'purple', feature: 'rewards' },
  { to: '/me/profile', icon: User, key: 'profile', tone: 'red' },
] as const;

export function BottomNav() {
  const { t } = useI18n();
  const { me } = useSession();
  return (
    <nav className="st-nav" aria-label="One-Cup">
      {TABS.filter((tab) => !('feature' in tab) || me?.features[tab.feature]).map(({ to, icon: Icon, key, tone, ...rest }) => (
        <NavLink
          key={to}
          to={to}
          end={'end' in rest}
          aria-label={t.nav[key]}
          title={t.nav[key]}
          style={{ ['--tone' as string]: `var(--${tone})`, ['--tone-soft' as string]: `var(--${tone}-soft)`, ['--tone-ink' as string]: `var(--${tone}-ink)` }}
        >
          <Icon size={26} strokeWidth={2.2} />
        </NavLink>
      ))}
    </nav>
  );
}

/**
 * Layout for signed-in pages. While the app is open it polls for scans made by the counter staff
 * and shows the celebration as soon as one arrives.
 */
export function StudentShell({ children, nav = true }: { children: ReactNode; nav?: boolean }) {
  const { token, me, loading, reload } = useSession();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!me) return;
    const newest = me.recent[0];
    if (!newest) return;
    const seen = lastSeen();
    if (!seen) return markSeen(newest.id);
    if (newest.id !== seen && newest.tier === 1 && Date.now() - Date.parse(newest.created_at) < 15 * 60_000) {
      markSeen(newest.id);
      navigate(`/me/celebrate/${newest.id}`);
    }
  }, [me, navigate]);

  useEffect(() => {
    if (!token) return;
    const poll = () => document.visibilityState === 'visible' && reload();
    const timer = setInterval(poll, 5000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [token, reload]);

  if (!token) return <Navigate to={`/welcome?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (loading || !me) {
    return (
      <div className="st-app">
        <main className="st-page center">
          <p className="muted">{t.common.loading}</p>
        </main>
      </div>
    );
  }
  return (
    <div className="st-app">
      <main className={`st-page ${nav ? 'has-nav' : ''}`}>{children}</main>
      {nav && <BottomNav />}
    </div>
  );
}
