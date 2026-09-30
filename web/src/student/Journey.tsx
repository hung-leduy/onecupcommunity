import { Check, Lock, Star } from 'lucide-react';
import { Fragment } from 'react';
import type { Me } from '../api';
import { useI18n } from '../i18n';
import { Qty } from '../ui/kit';
import { Mascot } from '../ui/Mascot';
import { useSession } from './session';
import { StudentShell } from './Shell';

export function Journey() {
  return (
    <StudentShell>
      <JourneyBody />
    </StudentShell>
  );
}

function JourneyBody() {
  const { me } = useSession() as { me: Me };
  const { t, f } = useI18n();
  const ms = me.milestones;
  const total = me.uses.total;
  const plastic = me.impact && f.mass(me.impact.plasticGrams);
  const co2 = me.impact && f.mass(me.impact.co2eGrams);

  return (
    <>
      <h1 className="st-title">{t.journey.title}</h1>
      <p className="st-sub">{ms?.next ? t.journey.next(ms.next) : t.journey.allDone}</p>

      {me.impact && plastic && co2 && (
        <div className="st-stats">
          <div className="st-stat st-stat--plain">
            <Qty value={String(total)} />
            <span>{t.journey.avoided}</span>
          </div>
          <div className="st-stat st-stat--plain">
            <Qty value={plastic.value} unit={plastic.unit} />
            <span>{t.home.plastic}</span>
          </div>
          <div className="st-stat st-stat--plain">
            <Qty value={co2.value} unit={co2.unit} />
            <span>{t.home.co2}</span>
          </div>
        </div>
      )}

      <div className="st-path">
        {ms?.list.map((m, i) => {
          const state = m.reached ? 'reached' : m.current ? 'current' : 'locked';
          return (
            <Fragment key={m.target}>
              {i > 0 && (
                <div className="st-dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              )}
              <div className={`st-node ${state} ${i % 2 ? 'right' : ''}`}>
                <span className="st-node__disc">
                  {state === 'reached' ? <Check size={38} strokeWidth={3.4} /> : state === 'current' ? <Star size={36} fill="#fff" strokeWidth={0} /> : <Lock size={28} strokeWidth={2.6} />}
                </span>
                <span className="st-node__label">
                  <b>{t.common.cups(m.target)}</b>
                  <span>{state === 'reached' ? t.journey.reached : state === 'current' ? t.journey.progress(total, m.target) : t.journey.locked}</span>
                </span>
                {state === 'current' && <Mascot size={64} />}
              </div>
            </Fragment>
          );
        })}
      </div>
    </>
  );
}
