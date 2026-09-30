import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { api, type Me } from '../api';
import { errorText, LangSwitch, useI18n } from '../i18n';
import { Bubble, Btn3D, Toggle } from '../ui/kit';
import { Mascot } from '../ui/Mascot';
import { Steps } from './RegisterCup';
import { PENDING_CUP, useSession } from './session';

const FACULTIES = ['eng', 'em', 'ace', 'staff', 'other'];
const INTAKES = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];

/** Sign-up: about you → privacy choices → (next page) register a cup. */
export function Onboarding() {
  const { token, signIn } = useSession();
  // Only a visitor who arrives already signed in is sent away; signing up here navigates by itself.
  const [signedInOnArrival] = useState(!!token);
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ nickname: '', faculty: '', intake: '', preferredMethod: '' });
  const [research, setResearch] = useState(false);
  const [openData, setOpenData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get('next');

  if (signedInOnArrival) return <Navigate to={next && next.startsWith('/') ? next : '/me'} replace />;

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<Me & { token: string }>('/api/users', {
        body: { ...form, intake: form.faculty === 'staff' ? '' : form.intake, consentParticipate: true, consentResearch: research, consentOpenData: research && openData },
      });
      signIn(r.token, r);
      navigate('/me/register-cup?onboarding=1', { replace: true });
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="st-app">
      <main className="st-page">
        <div className="st-topbar">
          {step === 2 ? (
            <button className="icon-btn" onClick={() => setStep(1)} aria-label={t.common.back}>
              <ChevronLeft size={28} strokeWidth={2.6} />
            </button>
          ) : null}
          <h1 className="title">{step === 1 ? t.onboarding.aboutYou : t.onboarding.privacyTitle}</h1>
          <LangSwitch />
        </div>
        <Steps done={step - 1} />

        {step === 1 ? (
          <>
            <div className="st-hello">
              <Mascot size={96} />
              <Bubble title={t.onboarding.welcomeTitle}>{t.onboarding.welcomeBody}</Bubble>
            </div>
            {sessionStorage.getItem(PENDING_CUP) && <p className="notice">{t.onboarding.haveCode}</p>}
            <label className="field">
              {t.onboarding.name}
              <input value={form.nickname} maxLength={40} placeholder={t.onboarding.namePlaceholder} onChange={(e) => setForm({ ...form, nickname: e.target.value })} autoComplete="nickname" />
              <small>{t.onboarding.nameHint}</small>
            </label>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <label className="field grow">
                {t.onboarding.faculty}
                <select value={form.faculty} onChange={(e) => setForm({ ...form, faculty: e.target.value })}>
                  <option value="">{t.onboarding.chooseFaculty}</option>
                  {FACULTIES.map((k) => (
                    <option key={k} value={k}>
                      {t.faculties[k]}
                    </option>
                  ))}
                </select>
              </label>
              {form.faculty !== 'staff' && (
                <label className="field" style={{ width: 130 }}>
                  {t.onboarding.intake}
                  <select value={form.intake} onChange={(e) => setForm({ ...form, intake: e.target.value })}>
                    <option value="">{t.onboarding.chooseIntake}</option>
                    {INTAKES.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                    <option value="other">{t.onboarding.otherIntake}</option>
                  </select>
                </label>
              )}
            </div>
            <div className="st-spacer" />
            <Btn3D className="block" disabled={!form.nickname.trim() || !form.faculty} onClick={() => setStep(2)}>
              {t.common.continue}
            </Btn3D>
          </>
        ) : (
          <>
            <p className="muted">{t.onboarding.privacyBody}</p>
            <section className="card st-settings">
              <div>
                <span className="grow">
                  <b>{t.profile.useApp}</b>
                  <span>{t.profile.useAppSub}</span>
                </span>
                <Toggle checked disabled label={t.profile.useApp} />
              </div>
              <div>
                <span className="grow">
                  <b>{t.profile.research}</b>
                  <span>{t.profile.researchSub}</span>
                </span>
                <Toggle
                  checked={research}
                  onChange={(v) => {
                    setResearch(v);
                    if (!v) setOpenData(false);
                  }}
                  label={t.profile.research}
                />
              </div>
              <div>
                <span className="grow">
                  <b>{t.profile.openData}</b>
                  <span>{t.profile.openDataSub}</span>
                </span>
                <Toggle checked={openData} disabled={!research} onChange={setOpenData} label={t.profile.openData} />
              </div>
            </section>
            {error && <p className="error-box">{error}</p>}
            <div className="st-spacer" />
            <Btn3D className="block" disabled={busy} onClick={submit}>
              {t.onboarding.agree}
            </Btn3D>
          </>
        )}
      </main>
    </div>
  );
}
