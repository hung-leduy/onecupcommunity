import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, store } from '../api';
import { en } from './en';
import { makeFormat, type Format, type Lang } from './format';
import { vi, type Dict } from './vi';

export type { Dict, Lang };

const DICTS: Record<Lang, Dict> = { vi, en };
const KEY = 'onecup.lang';

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: Dict; f: Format };
const Ctx = createContext<I18n | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (store.get(KEY) === 'en' ? 'en' : 'vi'));
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang: (l) => {
        store.set(KEY, l);
        setLangState(l);
      },
      t: DICTS[lang],
      f: makeFormat(lang),
    }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside LangProvider');
  return v;
}

/** Human-readable message for an API error code (or a local error key). */
export function errorText(t: Dict, err: unknown): string {
  if (err instanceof ApiError) return t.errors[err.code] ?? t.errors.server_error;
  if (err instanceof Error && t.errors[err.message]) return t.errors[err.message];
  return t.errors.server_error;
}

export function LangSwitch({ className = '' }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`lang-switch ${className}`} role="group" aria-label="Language / Ngôn ngữ">
      {(['vi', 'en'] as const).map((l) => (
        <button key={l} type="button" className={l === lang ? 'on' : ''} aria-pressed={l === lang} onClick={() => setLang(l)}>
          {l === 'vi' ? 'VI' : 'EN'}
        </button>
      ))}
    </div>
  );
}
