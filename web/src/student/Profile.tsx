import { ChevronRight, Download, Globe, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, download, type Me } from '../api';
import { QrImage } from '../QrImage';
import { errorText, LangSwitch, useI18n } from '../i18n';
import { CupIcon, FlameIcon, GemIcon } from '../ui/icons';
import { IconChip, Sheet, Toggle } from '../ui/kit';
import { Mascot } from '../ui/Mascot';
import { useSession } from './session';
import { StudentShell } from './Shell';

export function Profile() {
  return (
    <StudentShell>
      <ProfileBody />
    </StudentShell>
  );
}

function ProfileBody() {
  const { token, me, setMe, signOut } = useSession() as { token: string; me: Me; setMe: (m: Me) => void; signOut: () => void };
  const { t, f } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showCup, setShowCup] = useState<Me['cups'][number] | null>(null);
  const u = me.user;

  const patch = async (body: Record<string, unknown>) => {
    setError(null);
    try {
      setMe(await api<Me>('/api/me', { token, method: 'PATCH', body }));
    } catch (e) {
      setError(errorText(t, e));
    }
  };

  const who = [u.faculty && (t.faculties[u.faculty] ?? u.faculty), u.intake && t.intake(u.intake)].filter(Boolean).join(' · ');

  return (
    <>
      <h1 className="st-title">{t.profile.title}</h1>

      <section className="st-profile-head">
        <Mascot size={70} />
        <div className="stack" style={{ gap: 6 }}>
          <div>
            <h2>{u.nickname}</h2>
            {who && <p>{who}</p>}
          </div>
          {(me.goal || me.points !== null) && (
            <div className="row" style={{ gap: 8 }}>
              {me.goal && (
                <span className="pill">
                  <FlameIcon size={16} /> {me.goal.streak}
                </span>
              )}
              {me.points !== null && (
                <span className="pill">
                  <GemIcon size={16} /> {me.points}
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="st-research">
        <ShieldCheck size={22} />
        <div>
          <b>{u.consentResearch ? t.profile.inResearch : t.profile.outResearch}</b>
          <span>{u.consentResearch ? t.profile.inResearchBody(f.date(me.study.studyEnd)) : t.profile.outResearchBody}</span>
        </div>
      </section>
      {error && <p className="error-box">{error}</p>}

      <p className="section-label">{t.profile.agree}</p>
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
          <Toggle checked={u.consentResearch} onChange={(v) => patch({ consentResearch: v })} label={t.profile.research} />
        </div>
        <div>
          <span className="grow">
            <b>{t.profile.openData}</b>
            <span>{t.profile.openDataSub}</span>
          </span>
          <Toggle checked={u.consentOpenData} disabled={!u.consentResearch} onChange={(v) => patch({ consentOpenData: v })} label={t.profile.openData} />
        </div>
      </section>

      <p className="section-label">{t.profile.myCups}</p>
      <section className="card st-settings">
        {me.cups.map((c) => (
          <div key={c.id}>
            <IconChip tone={c.kind === 'nfc' ? 'blue' : 'green'}>
              <CupIcon size={20} />
            </IconChip>
            <span className="grow">
              <b>{c.displayCode}</b>
              <span>{c.kind === 'nfc' ? t.registerCup.own : t.registerCup.vgu}</span>
            </span>
            <button className="plain-btn" onClick={() => setShowCup(c)}>
              {t.profile.showCode}
            </button>
          </div>
        ))}
        <Link to="/me/register-cup?from=profile">
          <IconChip tone="green">
            <Plus size={20} />
          </IconChip>
          <span className="grow">
            <b>{t.profile.addCup}</b>
          </span>
          <ChevronRight size={20} className="muted" />
        </Link>
      </section>

      <p className="section-label">{t.profile.history}</p>
      <section className="card">
        {me.recent.length === 0 ? (
          <p className="muted">{t.profile.noHistory}</p>
        ) : (
          <ul className="st-history">
            {me.recent.slice(0, 8).map((s) => (
              <li key={s.id}>
                <span>
                  {f.dateTime(s.created_at)} · {s.vendor_name ?? t.celebrate.selfScan}
                </span>
                <span className={s.verified ? 'tone-green' : 'muted'}>{t.profile.tier[s.tier]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="section-label">{t.profile.myData}</p>
      <section className="card st-settings">
        <button className="grow-btn" onClick={() => download('/api/me/export', 'onecup-my-data.json', { token })}>
          <IconChip tone="blue">
            <Download size={20} />
          </IconChip>
          <span className="grow">
            <b>{t.profile.download}</b>
          </span>
          <ChevronRight size={20} className="muted" />
        </button>
        <div>
          <IconChip tone="green">
            <Globe size={20} />
          </IconChip>
          <span className="grow">
            <b>{t.profile.language}</b>
          </span>
          <LangSwitch />
        </div>
        <button
          className="grow-btn"
          onClick={async () => {
            if (!confirm(t.profile.deleteConfirm)) return;
            await api('/api/me', { token, method: 'DELETE' });
            signOut();
            navigate('/welcome', { replace: true });
          }}
        >
          <IconChip tone="red">
            <Trash2 size={20} />
          </IconChip>
          <span className="grow">
            <b className="tone-red">{t.profile.delete}</b>
          </span>
          <ChevronRight size={20} className="muted" />
        </button>
      </section>

      <Sheet open={!!showCup} onClose={() => setShowCup(null)} title={showCup?.displayCode}>
        {showCup && (
          <div className="stack center">
            <QrImage value={showCup.url} size={220} label={showCup.displayCode} />
            <button
              className="link-btn danger"
              onClick={async () => {
                if (!confirm(t.profile.unlinkConfirm(showCup.displayCode))) return;
                setMe(await api<Me>(`/api/me/cups/${showCup.id}`, { token, method: 'DELETE' }));
                setShowCup(null);
              }}
            >
              {t.profile.unlink}
            </button>
          </div>
        )}
      </Sheet>
    </>
  );
}
