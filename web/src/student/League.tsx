import { useEffect, useState } from 'react';
import { api, type League as LeagueData } from '../api';
import { errorText, useI18n } from '../i18n';
import { CrownIcon } from '../ui/icons';
import { useSession } from './session';
import { StudentShell } from './Shell';

export function League() {
  return (
    <StudentShell>
      <LeagueBody />
    </StudentShell>
  );
}

const PODIUM = [
  { place: 2, tone: 'blue', height: 74 },
  { place: 1, tone: 'yellow', height: 104 },
  { place: 3, tone: 'red', height: 52 },
] as const;

function LeagueBody() {
  const { token } = useSession();
  const { t } = useI18n();
  const [data, setData] = useState<LeagueData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<LeagueData>('/api/me/league', { token }).then(setData, (e) => setError(errorText(t, e)));
  }, [token, t]);

  if (error) return <p className="error-box">{error}</p>;
  if (!data) return <p className="muted">{t.common.loading}</p>;

  const next = t.leagues[Math.min(data.tier + 1, t.leagues.length - 1)];
  const byRank = (r: number) => data.members.find((m) => m.rank === r);
  // Members without a verified cup this week are summarised instead of ranked among themselves.
  const rest = data.members.filter((m) => m.rank > 3 && (m.cups > 0 || m.me));
  const idle = data.members.filter((m) => m.rank > 3 && m.cups === 0 && !m.me).length;
  const anyCups = data.members.some((m) => m.cups > 0);

  return (
    <>
      <h1 className="st-title">{t.league.title}</h1>
      <div className="st-league-banner">
        <CrownIcon size={34} />
        <div>
          <b>{t.leagues[data.tier]}</b>
          <span>{data.topTier ? t.league.top(data.daysLeft) : t.league.promote(data.promote, next, data.daysLeft)}</span>
        </div>
      </div>

      {!anyCups && <p className="notice">{t.league.empty}</p>}

      <div className="st-podium">
        {PODIUM.map(({ place, tone, height }) => {
          const m = byRank(place);
          const style = { ['--tone' as string]: `var(--${tone})`, ['--tone-dark' as string]: `var(--${tone}-dark)` };
          return (
            <div key={place} className={`st-podium__col ${m?.me ? 'me' : ''}`} style={style}>
              {m && (
                <>
                  {place === 1 && <CrownIcon size={26} />}
                  <span className="st-avatar" aria-hidden="true">
                    {m.initials}
                  </span>
                  <span className="st-podium__name">{m.name}</span>
                  {m.me && <span className="st-you">{t.league.you}</span>}
                  <span className="st-podium__cups">{t.common.cups(m.cups)}</span>
                </>
              )}
              <span className="st-podium__block" style={{ height }}>
                {place}
              </span>
            </div>
          );
        })}
      </div>

      <div className="stack" style={{ gap: 10 }}>
        {rest.map((m) => (
          <div key={m.rank}>
            {m.rank === data.promote + 1 && !data.topTier && <div className="st-zone" style={{ marginBottom: 10 }}>{t.league.zone}</div>}
            <div className={`card st-rank-row ${m.me ? 'me' : ''}`}>
              <span className="n">{m.cups > 0 ? m.rank : '—'}</span>
              <span className="st-avatar sm" aria-hidden="true">
                {m.initials}
              </span>
              <span className="name">
                {m.name} {m.me && <span className="st-you">{t.league.you}</span>}
              </span>
              <span className="cups">{m.cups}</span>
            </div>
          </div>
        ))}
      </div>
      {idle > 0 && <p className="muted small center">{t.league.idle(idle)}</p>}
      <p className="muted small center">{t.league.note}</p>
    </>
  );
}
