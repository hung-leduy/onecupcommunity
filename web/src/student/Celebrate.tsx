import { Cloud, Droplet, Info, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Me } from '../api';
import { useI18n } from '../i18n';
import { CupIcon, FlameIcon, GemIcon } from '../ui/icons';
import { Btn3D, Confetti, IconChip, Sheet } from '../ui/kit';
import { Mascot } from '../ui/Mascot';
import { useSession } from './session';
import { StudentShell } from './Shell';

export function Celebrate() {
  return (
    <StudentShell nav={false}>
      <CelebrateBody />
    </StudentShell>
  );
}

function CelebrateBody() {
  const { scanId } = useParams();
  const { me, reload } = useSession() as { me: Me; reload: () => Promise<Me | null> };
  const { t, f } = useI18n();
  const navigate = useNavigate();
  const [methodOpen, setMethodOpen] = useState(false);
  const scan = me.recent.find((s) => s.id === scanId);

  useEffect(() => {
    if (!scan) reload();
  }, [scan, reload]);

  if (!scan) return <p className="muted center">{t.common.loading}</p>;

  const { features, goal, impactPerCup } = me;
  const how = t.celebrate.how[scan.tier];
  const where = scan.vendor_name ?? t.celebrate.selfScan;
  const plastic = f.mass(impactPerCup.plasticGrams);
  const co2 = f.mass(impactPerCup.co2eGrams);

  return (
    <div className="stack" style={{ margin: '-18px -16px 0', gap: 14 }}>
      <section className="st-celebrate__hero">
        <Confetti />
        <Mascot mood="cheer" size={112} />
        <h1>{t.celebrate.title}</h1>
        <p>
          {where} · {f.time(scan.created_at)} · {how}
        </p>
      </section>

      <div className="stack" style={{ padding: '0 16px', gap: 14 }}>
        {(features.impactFeedback || scan.discount_vnd > 0 || features.gamification) && (
          <section className="card st-rows">
            {features.impactFeedback && (
              <div>
                <IconChip tone="green">
                  <CupIcon size={20} />
                </IconChip>
                <span className="st-rows__label">{t.celebrate.cupAvoided}</span>
                <b className="tone-green">+1</b>
              </div>
            )}
            {scan.discount_vnd > 0 && (
              <div>
                <IconChip tone="yellow">
                  <Store size={20} />
                </IconChip>
                <span className="st-rows__label">{t.celebrate.discount}</span>
                <b className="tone-yellow">−{f.vnd(scan.discount_vnd)}</b>
              </div>
            )}
            {features.gamification && scan.points > 0 && (
              <div>
                <IconChip tone="blue">
                  <GemIcon size={20} />
                </IconChip>
                <span className="st-rows__label">{t.celebrate.points}</span>
                <b className="tone-blue">+{scan.points}</b>
              </div>
            )}
            {features.impactFeedback && (
              <>
                <div>
                  <IconChip tone="blue">
                    <Droplet size={20} />
                  </IconChip>
                  <span className="st-rows__label">{t.celebrate.plastic}</span>
                  <b className="tone-blue">
                    {plastic.value} {plastic.unit}
                  </b>
                </div>
                <div>
                  <IconChip tone="purple">
                    <Cloud size={20} />
                  </IconChip>
                  <span className="st-rows__label">{t.celebrate.co2}</span>
                  <b className="tone-purple">
                    ≈ {co2.value} {co2.unit}
                  </b>
                </div>
              </>
            )}
          </section>
        )}

        {goal && (
          <section className="card st-streak-card">
            <div className="row between">
              <span className="row" style={{ gap: 8 }}>
                <FlameIcon size={22} />
                <b>{t.celebrate.streak(goal.streak)}</b>
              </span>
              <span className="muted small" style={{ fontWeight: 800 }}>
                {t.celebrate.today(goal.today, goal.daily)}
              </span>
            </div>
            <div className="progress">
              <i style={{ width: `${Math.min(100, (goal.today / goal.daily) * 100)}%` }} />
            </div>
          </section>
        )}

        {scan.tier === 3 && <p className="warn-box">{t.celebrate.unverifiedNote}</p>}

        {features.impactFeedback && (
          <p className="st-note">
            <Info size={16} />
            <span>
              {t.celebrate.note(impactPerCup.singleUseCo2eGrams)}{' '}
              <button className="link-btn" style={{ padding: 0 }} onClick={() => setMethodOpen(true)}>
                {t.celebrate.how2}
              </button>
            </span>
          </p>
        )}

        <Btn3D className="block" onClick={() => navigate('/me', { replace: true })}>
          {t.common.continue}
        </Btn3D>
      </div>

      <Sheet open={methodOpen} onClose={() => setMethodOpen(false)} title={t.celebrate.how2}>
        <p>{t.celebrate.method(impactPerCup.singleUseCo2eGrams, impactPerCup.co2eGrams, `${plastic.value} ${plastic.unit}`)}</p>
      </Sheet>
    </div>
  );
}
