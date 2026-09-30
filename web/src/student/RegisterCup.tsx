import { ChevronLeft, Nfc, ScanLine } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Cup, type Me } from '../api';
import { errorText, useI18n } from '../i18n';
import { QrCamera } from '../scan/QrCamera';
import { startNfcScan, webNfcSupported } from '../scan/webnfc';
import { CupIcon } from '../ui/icons';
import { Bubble, Btn3D, IconChip, Sheet } from '../ui/kit';
import { Mascot } from '../ui/Mascot';
import { classifyQr } from './actions';
import { PENDING_CUP, useSession } from './session';
import { StudentShell } from './Shell';

export function Steps({ done }: { done: number }) {
  return (
    <div className="st-steps" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} className={i < done ? 'on' : ''} />
      ))}
    </div>
  );
}

export function RegisterCup() {
  return (
    <StudentShell nav={false}>
      <RegisterCupBody />
    </StudentShell>
  );
}

function RegisterCupBody() {
  const { token, me, setMe } = useSession() as { token: string; me: Me; setMe: (m: Me) => void };
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const onboarding = params.has('onboarding');
  const next = params.get('from') === 'profile' ? '/me/profile' : '/me';
  const [kind, setKind] = useState<'vgu' | 'own'>(me.user.preferredMethod === 'nfc' ? 'own' : 'vgu');
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState<Cup | null>(null);
  const busy = useRef(false);

  async function link(body: { code?: string; nfcUid?: string }) {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    try {
      const r = await api<Me & { cup: Cup }>('/api/me/cups', { token, body });
      setMe(r);
      setLinked(r.cup);
      setOpen(false);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      busy.current = false;
    }
  }

  // A cup scanned before signing up (deep link /c/CODE) is linked straight away.
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_CUP);
    if (pending) {
      sessionStorage.removeItem(PENDING_CUP);
      link({ code: pending });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function tap() {
    setError(null);
    try {
      const stop = await startNfcScan(
        (r) => {
          stop();
          const fromUrl = r.url ? classifyQr(r.url) : null;
          link(fromUrl?.kind === 'cup' ? { code: fromUrl.code } : { nfcUid: r.uid });
        },
        () => setError(t.errors.bad_uid),
      );
    } catch {
      setError(t.errors.nfc_unavailable);
    }
  }

  if (linked) {
    return (
      <div className="stack center" style={{ marginTop: 40 }}>
        <Mascot mood="cheer" size={130} />
        <h1>{t.registerCup.linked(linked.displayCode)}</h1>
        <div className="st-spacer" />
        <Btn3D className="block" onClick={() => navigate(next, { replace: true })}>
          {t.common.continue}
        </Btn3D>
      </div>
    );
  }

  return (
    <>
      <div className="st-topbar">
        <button className="icon-btn" onClick={() => navigate(next)} aria-label={t.common.back}>
          <ChevronLeft size={28} strokeWidth={2.6} />
        </button>
        <h1 className="title">{t.registerCup.title}</h1>
      </div>
      {onboarding && <Steps done={2} />}

      <div className="st-hello">
        <Mascot size={96} />
        <Bubble title={t.registerCup.bubbleTitle}>{t.registerCup.bubbleBody}</Bubble>
      </div>

      <h2 style={{ fontSize: '1.35rem' }}>{t.registerCup.question}</h2>
      <button className={`st-option ${kind === 'vgu' ? 'on' : ''}`} onClick={() => setKind('vgu')} aria-pressed={kind === 'vgu'}>
        <IconChip tone="green" size="lg">
          <CupIcon size={26} />
        </IconChip>
        <span className="grow">
          <b>{t.registerCup.vgu}</b>
          <span>{t.registerCup.vguSub}</span>
        </span>
        <i className={`radio ${kind === 'vgu' ? 'on' : ''}`} />
      </button>
      <button className={`st-option ${kind === 'own' ? 'on' : ''}`} onClick={() => setKind('own')} aria-pressed={kind === 'own'}>
        <IconChip tone="blue" size="lg">
          <Nfc size={26} />
        </IconChip>
        <span className="grow">
          <b>{t.registerCup.own}</b>
          <span>{t.registerCup.ownSub}</span>
        </span>
        <i className={`radio ${kind === 'own' ? 'on' : ''}`} />
      </button>

      {error && <p className="error-box">{error}</p>}
      <div className="st-spacer" />
      <div className="stack" style={{ gap: 4 }}>
        <Btn3D className="block" icon={<ScanLine size={22} />} onClick={() => setOpen(true)}>
          {t.registerCup.scan}
        </Btn3D>
        <button className="link-btn muted" onClick={() => navigate(next)}>
          {t.common.later}
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title={t.registerCup.scan}>
        {open && (
          <QrCamera
            onResult={(text) => {
              const what = classifyQr(text);
              if (what?.kind === 'cup') link({ code: what.code });
              else setError(t.errors.not_onecup_code);
            }}
          />
        )}
        {kind === 'own' && webNfcSupported() && (
          <Btn3D tone="blue" className="block" icon={<Nfc size={20} />} onClick={tap}>
            {t.registerCup.tapSticker}
          </Btn3D>
        )}
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault();
            link({ code });
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder={t.registerCup.codePlaceholder} aria-label={t.registerCup.typeCode} />
          <button className="plain-btn" disabled={code.trim().length < 4}>
            {t.registerCup.link}
          </button>
        </form>
        {kind === 'own' && <p className="muted small">{t.registerCup.ownHint}</p>}
        {error && <p className="error-box">{error}</p>}
      </Sheet>
    </>
  );
}
