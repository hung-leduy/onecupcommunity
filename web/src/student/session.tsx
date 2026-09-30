import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError, store, USER_TOKEN, type Me } from '../api';

type Session = {
  token: string | null;
  me: Me | null;
  loading: boolean;
  setMe: (m: Me) => void;
  reload: () => Promise<Me | null>;
  signIn: (token: string, me: Me) => void;
  signOut: () => void;
};

const Ctx = createContext<Session | null>(null);
const LAST_SEEN = 'onecup.lastSeenScan';
export const PENDING_CUP = 'onecup.pendingCup';

/** Demo / recovery links carry the token in the URL fragment: /me#t=<token>. */
function tokenFromHash(): string | null {
  const m = window.location.hash.match(/^#t=([\w-]{20,})$/);
  if (!m) return null;
  store.set(USER_TOKEN, m[1]);
  history.replaceState(null, '', window.location.pathname + window.location.search);
  return m[1];
}

export function StudentSession({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => tokenFromHash() ?? store.get(USER_TOKEN));
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!token);

  const reload = useCallback(async () => {
    if (!token) return null;
    try {
      const m = await api<Me>('/api/me', { token });
      setMe(m);
      return m;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        store.set(USER_TOKEN, null);
        setToken(null);
        setMe(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    reload();
  }, [reload]);

  const value: Session = {
    token,
    me,
    loading,
    setMe,
    reload,
    signIn: (t, m) => {
      store.set(USER_TOKEN, t);
      markSeen(m.recent[0]?.id);
      setToken(t);
      setMe(m);
      setLoading(false);
    },
    signOut: () => {
      store.set(USER_TOKEN, null);
      store.set(LAST_SEEN, null);
      setToken(null);
      setMe(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): Session {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession outside StudentSession');
  return s;
}

/** Remember the newest scan the participant has already seen celebrated. */
export function markSeen(scanId: string | undefined) {
  if (scanId) store.set(LAST_SEEN, scanId);
}
export const lastSeen = () => store.get(LAST_SEEN);

/** First name for greetings: "Minh Anh Lê" → "Minh Anh". */
export function firstName(name: string) {
  const words = name.trim().split(/\s+/);
  return words.length > 1 ? words.slice(0, -1).join(' ') : words[0];
}
