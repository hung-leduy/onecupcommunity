import { Check, Cloud, Droplet, Plus, ScanLine, Users } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import type { Me } from '../api';
import { useI18n } from '../i18n';
import { CrownIcon, CupIcon, FlameIcon, GemIcon } from '../ui/icons';
import { Bubble, Btn3D, IconChip, Qty, Ring } from '../ui/kit';
import { Mascot } from '../ui/Mascot';
import { firstName, useSession } from './session';
import { StudentShell } from './Shell';

export function Home() {
  return (
    <StudentShell>
      <HomeBody />
    </StudentShell>
  );
}

function HomeBody() {
  const { me } = useSession() as { me: Me };
  const { t } = useI18n();
  const navigate = useNavigate();
  const { features, goal } = me;
  const hasCup = me.cups.length > 0;

  const message = !hasCup
    ? t.home.noCup
    : !goal
      ? t.home.bringCup
      : goal.today >= goal.daily
        ? t.home.goalDone
        : t.home.goalLeft(goal.daily - goal.today);

  return (
    <>
      <div className="st-chips">
        {goal && (
          <span className="st-chip st-chip--red" title={t.home.streakLabel}>
            <FlameIcon size={20} /> {goal.streak}
          </span>
        )}
        {me.points !== null && (
          <span className="st-chip st-chip--blue" title={t.home.pointsLabel}>
            <GemIcon size={20} /> {me.points}
          </span>
        )}
        <span className="st-chip st-chip--green" title={t.home.cupsLabel}>
          <CupIcon size={19} /> {me.uses.total}
        </span>
        <span className="st-spacer" />
        {features.gamification && (
          <Link className="icon-btn boxed" to="/me/league" aria-label={t.home.community}>
            <Users size={22} />
          </Link>
        )}
      </div>

      <div className="st-hello">
        <Mascot size={92} />
        <Bubble title={t.home.hello(firstName(me.user.nickname))}>{message}</Bubble>
      </div>

      {goal && hasCup && <GoalCard me={me} />}

      {me.impact && (
        <div className="st-stats">
          <div className="st-stat">
            <IconChip tone="green" size="sm">
              <CupIcon size={17} />
            </IconChip>
            <Qty value={String(me.impact.cupsAvoided)} />
            <span>{t.home.cupsAvoided}</span>
          </div>
          <MassStat tone="blue" icon={<Droplet size={17} />} grams={me.impact.plasticGrams} label={t.home.plastic} />
          <MassStat tone="purple" icon={<Cloud size={17} />} grams={me.impact.co2eGrams} label={t.home.co2} />
        </div>
      )}

      {me.league && (
        <Link to="/me/league" className="card st-league-card">
          <IconChip tone="yellow" size="lg">
            <CrownIcon size={28} />
          </IconChip>
          <div className="grow">
            <h3>{t.leagues[me.league.tier]}</h3>
            <p>{me.league.cups > 0 ? t.home.leagueSub(me.league.rank, me.league.daysLeft) : t.home.leagueStart(me.league.daysLeft)}</p>
          </div>
          {me.league.cups > 0 && <span className="rank">#{me.league.rank}</span>}
        </Link>
      )}

      {!features.impactFeedback && <RecentCard me={me} />}

      <div className="st-spacer" />
      <div className="st-bottom-cta">
        {hasCup ? (
          <Btn3D className="block" icon={<ScanLine size={22} />} onClick={() => navigate('/me/scan')}>
            {t.home.scan}
          </Btn3D>
        ) : (
          <Btn3D className="block" icon={<Plus size={22} />} onClick={() => navigate('/me/register-cup')}>
            {t.home.addCup}
          </Btn3D>
        )}
      </div>
    </>
  );
}

function MassStat({ tone, icon, grams, label }: { tone: 'blue' | 'purple'; icon: React.ReactNode; grams: number; label: string }) {
  const { f } = useI18n();
  const m = f.mass(grams);
  return (
    <div className="st-stat">
      <IconChip tone={tone} size="sm">
        {icon}
      </IconChip>
      <Qty value={m.value} unit={m.unit} />
      <span>{label}</span>
    </div>
  );
}

function GoalCard({ me }: { me: Me }) {
  const { t } = useI18n();
  const goal = me.goal!;
  const left = Math.max(0, goal.daily - goal.today);
  const parts = goal.streak > 0 ? t.home.keepStreak(left, goal.streak) : t.home.startStreak(left);
  return (
    <section className="card st-goal">
      <div className="st-goal__top">
        <div className="st-goal__ring">
          <Ring value={goal.today} max={goal.daily} size={78} />
          <b>
            {goal.today}
            <small>{t.home.ringUnit(goal.daily)}</small>
          </b>
        </div>
        <div className="st-goal__text">
          <h2>{t.home.goalTitle}</h2>
          <p>
            {left === 0 ? (
              t.home.streakDone(goal.streak)
            ) : (
              <>
                {parts[0]}
                <b>{parts[1]}</b>
                {parts[2]}
              </>
            )}
          </p>
        </div>
      </div>
      <div className="st-week">
        {goal.week.map((d, i) => (
          <span key={d.day} className={d.status}>
            <i>{d.status === 'done' && <Check size={16} strokeWidth={3.5} />}</i>
            {t.weekdays[i]}
          </span>
        ))}
      </div>
    </section>
  );
}

function RecentCard({ me }: { me: Me }) {
  const { t, f } = useI18n();
  if (!me.recent.length) return null;
  return (
    <section className="card">
      <h3>{t.home.recent}</h3>
      <ul className="st-history">
        {me.recent.slice(0, 5).map((s) => (
          <li key={s.id}>
            <span>
              {f.dateTime(s.created_at)} · {s.vendor_name ?? t.celebrate.selfScan}
            </span>
            <span className={s.verified ? 'tone-green' : 'muted'}>{t.profile.tier[s.tier]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
