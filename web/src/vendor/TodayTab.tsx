import { Store, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { errorText, useI18n } from '../i18n';
import { CupIcon } from '../ui/icons';
import { ColumnChart } from '../ui/charts';
import { IconChip } from '../ui/kit';
import { useTerminal, type Today } from './terminal';

const OPEN_FROM = 7;
const OPEN_TO = 18;

export function TodayTab() {
  const { today, token, setToday } = useTerminal();
  const { t, f } = useI18n();
  const [day, setDay] = useState<string | null>(null);
  const [drinks, setDrinks] = useState('');
  const [observed, setObserved] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const selected = day ?? today?.day ?? '';
  const entry = today?.lastWeekDays.find((d) => d.day === selected);
  useEffect(() => {
    setDrinks(entry?.drinks_total != null ? String(entry.drinks_total) : '');
    setObserved(entry?.reusable_observed != null ? String(entry.reusable_observed) : '');
  }, [selected, entry?.drinks_total, entry?.reusable_observed]);

  if (!today) return <p className="muted">{t.common.loading}</p>;

  const hours = new Map(today.byHour.map((h) => [h.hour, h.n]));
  const first = Math.min(OPEN_FROM, ...today.byHour.map((h) => h.hour));
  const last = Math.max(OPEN_TO, ...today.byHour.map((h) => h.hour));
  const nowHour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()));
  const peak = Math.max(0, ...today.byHour.map((h) => h.n));
  const cols = Array.from({ length: last - first + 1 }, (_, i) => {
    const hour = first + i;
    const n = hours.get(hour) ?? 0;
    return {
      key: String(hour),
      label: String(hour),
      value: n,
      emphasis: hour === nowHour,
      showValue: hour === nowHour || (n === peak && n > 0),
      tip: (
        <>
          <b>{t.common.cups(n)}</b> {`${hour}:00–${hour + 1}:00`}
        </>
      ),
    };
  });
  const days = [today.day, ...Array.from({ length: 6 }, (_, i) => new Date(Date.parse(today.day) - (i + 1) * 86_400_000).toISOString().slice(0, 10))];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      const r = await api<Today>(`/api/vendor/days/${selected}`, {
        token,
        method: 'PUT',
        body: { drinksTotal: drinks === '' ? null : Number(drinks), reusableObserved: observed === '' ? null : Number(observed) },
      });
      setToday(r);
      setMsg({ ok: true, text: t.common.saved });
    } catch (err) {
      setMsg({ ok: false, text: errorText(t, err) });
    }
  }

  return (
    <>
      {!today.intervention && (
        <p className="warn-box">
          <TriangleAlert size={20} />
          <span>{t.vendor.preIntervention}</span>
        </p>
      )}
      <section className="card vd-share">
        <div className="row between" style={{ alignItems: 'flex-start' }}>
          <div>
            <b className="vd-share__pct">{today.share === null ? '—' : f.pct(today.share)}</b>
            <p>{today.share === null ? t.vendor.needDrinks : t.vendor.shareLabel}</p>
          </div>
          <div className="vd-share__count">
            <b>{today.scansToday}</b>
            <span>{t.vendor.cupsToday}</span>
          </div>
        </div>
        <div className="progress progress--blue">
          <i style={{ width: `${Math.round((today.share ?? 0) * 100)}%` }} />
        </div>
        <form className="vd-drinks" onSubmit={save}>
          <label className="field">
            {t.vendor.day}
            <select value={selected} onChange={(e) => setDay(e.target.value)}>
              {days.map((d, i) => (
                <option key={d} value={d}>
                  {i === 0 ? t.vendor.todayLabel : f.date(d)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            {t.vendor.drinks}
            <input inputMode="numeric" value={drinks} onChange={(e) => setDrinks(e.target.value.replace(/\D/g, ''))} />
          </label>
          {!today.intervention && (
            <label className="field">
              {t.vendor.observed}
              <input inputMode="numeric" value={observed} onChange={(e) => setObserved(e.target.value.replace(/\D/g, ''))} />
            </label>
          )}
          <button className="plain-btn">{t.common.save}</button>
        </form>
        {msg && <p className={msg.ok ? 'notice' : 'error-box'}>{msg.text}</p>}
      </section>

      <section className="card">
        <h2 style={{ marginBottom: 8 }}>{t.vendor.byHour}</h2>
        <ColumnChart data={cols} height={170} tone="blue" caption={t.vendor.byHour} />
      </section>

      <div className="vd-stats">
        <section className="card">
          <IconChip tone="yellow">
            <Store size={20} />
          </IconChip>
          <b>{f.vndShort(today.savedVnd)}</b>
          <span>{t.vendor.saved}</span>
        </section>
        <section className="card">
          <IconChip tone="green">
            <CupIcon size={20} />
          </IconChip>
          <b>{f.num(today.monthCount)}</b>
          <span>{t.vendor.month}</span>
        </section>
      </div>
    </>
  );
}
