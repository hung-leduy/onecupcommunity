import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, store, USER_TOKEN, type Me } from './api';

/** Current student session (token in localStorage). */
export function useMe() {
  const [token, setToken] = useState<string | null>(() => store.get(USER_TOKEN));
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(!!token);

  const reload = useCallback(async () => {
    if (!token) return;
    try {
      setMe(await api<Me>('/api/me', { token }));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        store.set(USER_TOKEN, null);
        setToken(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { reload(); }, [reload]);

  const signIn = (t: string, m: Me) => { setToken(t); setMe(m); };
  const signOut = () => { store.set(USER_TOKEN, null); setToken(null); setMe(null); };
  return { token, me, setMe, reload, loading, signIn, signOut };
}
