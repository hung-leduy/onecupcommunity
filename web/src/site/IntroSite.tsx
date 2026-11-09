// Public project site at "/": what One-Cup-Community is, how it works and why it is a study.
// Same visual language as the app (chunky cards, 3D buttons, the mascot), aggregates only.
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChartColumn,
  Check,
  ClipboardList,
  Cloud,
  Code,
  Crown,
  Database,
  Download,
  Droplet,
  EyeOff,
  Flag,
  FlaskConical,
  Gift,
  GraduationCap,
  Hand,
  HeartHandshake,
  House,
  Leaf,
  Megaphone,
  Microscope,
  Nfc,
  PenTool,
  Plus,
  QrCode,
  Repeat,
  Rocket,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Smile,
  Sparkles,
  Store,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api, type PublicStats } from '../api';
import { LangSwitch, useI18n, type Dict } from '../i18n';
import { useSession } from '../student/session';
import { CrownIcon, CupIcon, FlameIcon, GemIcon } from '../ui/icons';
import { Bubble, Confetti, IconChip, Qty, Ring } from '../ui/kit';
import { Mascot } from '../ui/Mascot';
import '../styles/site.css';

type Tone = 'green' | 'blue' | 'yellow' | 'red' | 'purple';
type Stats = { data: PublicStats | null; failed: boolean };

/** Provisional per-cup factors, used until the server answers. */
const PER_CUP = { plasticGrams: 6.5, co2eGrams: 53 };
const PILOT_WEEKS = 12;

/** Project phases (months, inclusive) — the text lives in the dictionaries. */
const PHASES: { from: string; to: string; icon: LucideIcon }[] = [
  { from: '2026-10', to: '2026-12', icon: ClipboardList },
  { from: '2027-01', to: '2027-02', icon: PenTool },
  { from: '2027-03', to: '2027-03', icon: Rocket },
  { from: '2027-04', to: '2027-06', icon: Store },
  { from: '2027-07', to: '2027-08', icon: ChartColumn },
  { from: '2027-09', to: '2027-09', icon: Megaphone },
];

const NAV = ['how', 'app', 'impact', 'research', 'roadmap', 'faq'] as const;

export function IntroSite() {
  const { t } = useI18n();
  const stats = usePublicStats();

  useEffect(() => {
    const previous = document.title;
    document.title = t.site.title;
    return () => {
      document.title = previous;
    };
  }, [t]);

  return (
    <div className="site">
      <SiteHeader />
      <main>
        <Hero stats={stats} />
        {!stats.failed && <Scoreboard stats={stats.data} />}
        <Why />
        <How />
        <AppSection />
        <ImpactCalculator stats={stats.data} />
        <Research />
        <Roadmap today={stats.data?.today ?? campusToday()} />
        <Privacy />
        <Outcomes />
        <Team />
        <Faq />
      </main>
      <Finale />
    </div>
  );
}

// ---- data helpers ---------------------------------------------------------------------------

function usePublicStats(): Stats {
  const [state, setState] = useState<Stats>({ data: null, failed: false });
  useEffect(() => {
    let alive = true;
    api<PublicStats>('/api/public/stats')
      .then((data) => alive && setState({ data, failed: false }))
      .catch(() => alive && setState({ data: null, failed: true }));
    return () => {
      alive = false;
    };
  }, []);
  return state;
}

/** Today on campus as YYYY-MM-DD, whatever the device's time zone. */
function campusToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

/** Eases from 0 up to `target` once it is known (instantly when motion is reduced). */
function useCountUp(target: number | null, ms = 1000) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null) return;
    if (!target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target);
      return;
    }
    let frame = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      setValue(target * (1 - (1 - p) ** 3));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, ms]);
  return value;
}

const toneStyle = (tone: Tone) => `tn-${tone}`;

// ---- layout pieces --------------------------------------------------------------------------

/** Returning participants (a session on this device) get "open app" instead of "join". */
function useJoinLabel(join: string) {
  const { t } = useI18n();
  return useSession().token ? t.site.openApp : join;
}

function SiteHeader() {
  const { t } = useI18n();
  const join = useJoinLabel(t.site.join);
  return (
    <header className="site-top">
      <div className="site-wrap site-top__in">
        <a className="site-logo" href="#top">
          <Mascot size={30} />
          <span>One-Cup</span>
        </a>
        <nav className="site-nav" aria-label="One-Cup-Community">
          {NAV.map((key) => (
            <a key={key} href={`#${key}`}>
              {t.site.nav[key]}
            </a>
          ))}
        </nav>
        <div className="site-top__end">
          <LangSwitch />
          <Link className="btn3d sm" to="/me">
            <span>{join}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

function SectionHead({ id, label, title, body, center = false }: { id: string; label: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={`site-sechead ${center ? 'center' : ''}`}>
      <span className="site-label">{label}</span>
      <h2 id={id}>{title}</h2>
      {body && <p className="site-lead">{body}</p>}
    </div>
  );
}

/** Wavy edge for the coloured bands; takes the band's colour. */
function Wave({ bottom = false }: { bottom?: boolean }) {
  return (
    <svg className={`site-wave ${bottom ? 'site-wave--bottom' : 'site-wave--top'}`} viewBox="0 0 1440 48" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0 48V28C120 12 240 4 360 10s240 30 360 30 240-24 360-30 240 4 360 16V48Z" fill="currentColor" />
    </svg>
  );
}

// ---- sections -------------------------------------------------------------------------------

function Hero({ stats }: { stats: Stats }) {
  const { t, f } = useI18n();
  const h = t.site.hero;
  const join = useJoinLabel(h.cta);
  const plastic = f.mass(stats.data?.perCup.plasticGrams ?? PER_CUP.plasticGrams);
  return (
    <section className={`site-hero ${stats.failed ? '' : 'has-score'}`} id="top" aria-labelledby="site-title">
      <div className="site-wrap site-hero__in">
        <div className="site-hero__text">
          <span className="site-kicker">
            <Sparkles size={16} strokeWidth={2.6} /> {h.kicker}
          </span>
          <h1 id="site-title">
            {h.title[0]}
            <br />
            <span>{h.title[1]}</span>
          </h1>
          <p className="site-lead">{h.body}</p>
          <div className="site-hero__ctas">
            <Link className="btn3d" to="/me">
              <span>{join}</span>
              <ArrowRight size={20} strokeWidth={3} />
            </Link>
            <a className="btn3d btn3d--white" href="#how">
              <span>{h.how}</span>
            </a>
          </div>
          <ul className="site-stickers">
            <li className="tn-blue">
              <Smartphone size={16} strokeWidth={2.6} /> {h.stickers[0]}
            </li>
            <li className="tn-yellow">
              <Nfc size={16} strokeWidth={2.6} /> {h.stickers[1]}
            </li>
            <li className="tn-purple">
              <CalendarDays size={16} strokeWidth={2.6} /> {h.stickers[2]}
            </li>
          </ul>
        </div>
        <div className="site-hero__art" aria-hidden="true">
          <div className="site-hero__disc" />
          <Confetti />
          <div className="site-hero__bubble">
            <Bubble title={h.bubble} />
          </div>
          <Mascot size={210} className="site-bob" />
          <span className="site-float site-float--a">
            <FlameIcon size={20} /> 5
          </span>
          <span className="site-float site-float--b">
            <GemIcon size={20} /> +10
          </span>
          <span className="site-float site-float--c">
            <Leaf size={18} strokeWidth={2.6} /> {h.plasticChip(`${plastic.value} ${plastic.unit}`)}
          </span>
          <span className="site-float site-float--d">
            <QrCode size={24} strokeWidth={2.4} />
          </span>
          <span className="site-float site-float--e">
            <Nfc size={24} strokeWidth={2.4} />
          </span>
        </div>
      </div>
    </section>
  );
}

function Scoreboard({ stats }: { stats: PublicStats | null }) {
  const { t, f } = useI18n();
  const l = t.site.live;
  const co2 = stats?.impact.co2eGrams ?? null;
  const co2InKg = (co2 ?? 0) >= 1000;
  const cups = useCountUp(stats?.impact.cupsAvoided ?? null);
  const people = useCountUp(stats?.participants ?? null);
  const co2Value = useCountUp(co2 === null ? null : co2InKg ? co2 / 1000 : co2);
  const outlets = useCountUp(stats?.outlets ?? null);
  const show = (v: number, digits = 0) => (stats ? f.num(digits ? v : Math.round(v), digits) : '—');

  return (
    <section className="site-wrap site-score" aria-labelledby="score-title" aria-busy={!stats}>
      <div className="site-score__card">
        <div className="site-score__head">
          <h2 id="score-title">{l.title}</h2>
          {stats &&
            (stats.demo ? (
              <span className="site-pill site-pill--demo">{l.demo}</span>
            ) : (
              <span className="site-pill site-pill--live">
                <i /> {l.live}
              </span>
            ))}
          <span className="grow" />
          {stats && (
            <span className="site-score__status">
              <CalendarDays size={18} strokeWidth={2.6} /> {pilotStatus(stats, l)}
            </span>
          )}
        </div>
        <div className="site-score__grid">
          <ScoreStat tone="green" icon={<CupIcon size={22} />} value={show(cups)} label={l.cups} />
          <ScoreStat tone="blue" icon={<Users size={22} strokeWidth={2.4} />} value={show(people)} label={l.people} />
          <ScoreStat tone="purple" icon={<Cloud size={22} strokeWidth={2.4} />} value={show(co2Value, co2InKg ? 1 : 0)} unit={stats ? (co2InKg ? 'kg' : 'g') : undefined} label={l.co2} />
          <ScoreStat tone="yellow" icon={<Store size={22} strokeWidth={2.4} />} value={show(outlets)} label={l.outlets} />
        </div>
        <p className="site-score__note">{l.note}</p>
      </div>
    </section>
  );
}

function pilotStatus(s: PublicStats, l: Dict['site']['live']) {
  const days = daysBetween(s.today, s.pilot.start);
  if (days > 0) return l.countdown(days);
  if (s.today > s.pilot.end) return l.ended;
  return l.running(s.pilot.week, s.pilot.weeks);
}

function ScoreStat({ tone, icon, value, unit, label }: { tone: Tone; icon: ReactNode; value: string; unit?: string; label: string }) {
  return (
    <div className={`site-stat ${toneStyle(tone)}`}>
      <IconChip tone={tone} size="md">
        {icon}
      </IconChip>
      <b>
        <Qty value={value} unit={unit} />
      </b>
      <span>{label}</span>
    </div>
  );
}

function Why() {
  const { t } = useI18n();
  const w = t.site.why;
  const cards: { tone: Tone; icon: ReactNode }[] = [
    { tone: 'red', icon: <Hand size={26} strokeWidth={2.4} /> },
    { tone: 'green', icon: <Sparkles size={26} strokeWidth={2.4} /> },
    { tone: 'blue', icon: <CalendarDays size={26} strokeWidth={2.4} /> },
  ];
  return (
    <section className="site-section" aria-labelledby="why-title">
      <div className="site-wrap">
        <SectionHead id="why-title" label={w.label} title={w.title} body={w.body} />
        <div className="site-grid site-grid--3">
          {w.cards.map((c, i) => (
            <article key={c.title} className="site-card site-card--icon">
              <IconChip tone={cards[i].tone} size="lg">
                {cards[i].icon}
              </IconChip>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function How() {
  const { t } = useI18n();
  const s = t.site.how;
  const steps: { tone: Tone; icon: ReactNode }[] = [
    { tone: 'green', icon: <QrCode size={30} strokeWidth={2.4} /> },
    { tone: 'blue', icon: <Smartphone size={30} strokeWidth={2.4} /> },
    { tone: 'yellow', icon: <Nfc size={30} strokeWidth={2.4} /> },
    { tone: 'purple', icon: <Gift size={30} strokeWidth={2.4} /> },
  ];
  return (
    <section className="site-band site-band--mint" id="how" aria-labelledby="how-title">
      <Wave />
      <div className="site-wrap">
        <SectionHead id="how-title" label={s.label} title={s.title} center />
        <ol className="site-steps">
          {s.steps.map((step, i) => (
            <li key={step.title} className={`site-step ${toneStyle(steps[i].tone)}`}>
              <span className="site-step__num" aria-hidden="true">
                {i + 1}
              </span>
              <span className="site-step__icon" aria-hidden="true">
                {steps[i].icon}
              </span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
      <Wave bottom />
    </section>
  );
}

function AppSection() {
  const { t } = useI18n();
  const a = t.site.app;
  const features: { tone: Tone; icon: ReactNode }[] = [
    { tone: 'red', icon: <FlameIcon size={26} /> },
    { tone: 'blue', icon: <Flag size={24} strokeWidth={2.4} /> },
    { tone: 'yellow', icon: <CrownIcon size={28} /> },
    { tone: 'purple', icon: <Gift size={24} strokeWidth={2.4} /> },
    { tone: 'green', icon: <Leaf size={24} strokeWidth={2.4} /> },
  ];
  return (
    <section className="site-section" id="app" aria-labelledby="app-title">
      <div className="site-wrap site-app">
        <div className="site-app__phone">
          <PhoneMock />
        </div>
        <div>
          <SectionHead id="app-title" label={a.label} title={a.title} />
          <ul className="site-features">
            {a.features.map((ft, i) => (
              <li key={ft.title}>
                <IconChip tone={features[i].tone} size="lg">
                  {features[i].icon}
                </IconChip>
                <div>
                  <h3>{ft.title}</h3>
                  <p>{ft.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="site-callout">
            <FlaskConical size={22} strokeWidth={2.4} />
            <span>{a.note}</span>
          </p>
        </div>
      </div>
    </section>
  );
}

/** The app's home screen, drawn with the app's own components and made-up numbers. */
function PhoneMock() {
  const { t, f } = useI18n();
  const cups = 23;
  const plastic = f.mass(cups * PER_CUP.plasticGrams);
  const co2 = f.mass(cups * PER_CUP.co2eGrams);
  const streak = t.home.keepStreak(1, 5);
  const week = ['done', 'done', 'done', 'today', 'open', 'open', 'open'];
  const tabs = [House, Flag, Crown, Store, User];
  return (
    <div className="site-phone" role="img" aria-label={t.site.app.mockLabel}>
      <div className="site-phone__screen" aria-hidden="true">
        <span className="site-phone__notch" />
        <div className="st-chips">
          <span className="st-chip st-chip--red">
            <FlameIcon size={18} /> 5
          </span>
          <span className="st-chip st-chip--blue">
            <GemIcon size={18} /> 120
          </span>
          <span className="st-chip st-chip--green">
            <CupIcon size={17} /> {cups}
          </span>
        </div>
        <div className="st-hello">
          <Mascot size={66} />
          <Bubble title={t.home.hello(t.site.app.mockName)}>{t.home.goalLeft(1)}</Bubble>
        </div>
        <div className="card st-goal">
          <div className="st-goal__top">
            <div className="st-goal__ring">
              <Ring value={2} max={3} size={66} stroke={8} />
              <b>
                2<small>{t.home.ringUnit(3)}</small>
              </b>
            </div>
            <div className="st-goal__text">
              <h2>{t.home.goalTitle}</h2>
              <p>
                {streak[0]}
                <b>{streak[1]}</b>
                {streak[2]}
              </p>
            </div>
          </div>
          <div className="st-week">
            {week.map((status, i) => (
              <span key={i} className={status}>
                <i>{status === 'done' && <Check size={14} strokeWidth={3.5} />}</i>
                {t.weekdays[i]}
              </span>
            ))}
          </div>
        </div>
        <div className="st-stats">
          <div className="st-stat">
            <IconChip tone="green" size="sm">
              <CupIcon size={15} />
            </IconChip>
            <Qty value={String(cups)} />
            <span>{t.home.cupsAvoided}</span>
          </div>
          <div className="st-stat">
            <IconChip tone="blue" size="sm">
              <Droplet size={15} />
            </IconChip>
            <Qty value={plastic.value} unit={plastic.unit} />
            <span>{t.home.plastic}</span>
          </div>
          <div className="st-stat">
            <IconChip tone="purple" size="sm">
              <Cloud size={15} />
            </IconChip>
            <Qty value={co2.value} unit={co2.unit} />
            <span>{t.home.co2}</span>
          </div>
        </div>
        <div className="card st-league-card">
          <IconChip tone="yellow" size="lg">
            <CrownIcon size={26} />
          </IconChip>
          <div className="grow">
            <h3>{t.leagues[1]}</h3>
            <p>{t.home.leagueSub(3, 4)}</p>
          </div>
          <span className="rank">#3</span>
        </div>
        <span className="btn3d block site-phone__cta">
          <ScanLine size={20} />
          <span>{t.home.scan}</span>
        </span>
        <span className="site-phone__nav">
          {tabs.map((Icon, i) => (
            <i key={i} className={i === 0 ? 'on' : ''}>
              <Icon size={20} strokeWidth={2.2} />
            </i>
          ))}
        </span>
      </div>
    </div>
  );
}

function ImpactCalculator({ stats }: { stats: PublicStats | null }) {
  const { t, f } = useI18n();
  const c = t.site.impact;
  const [perWeek, setPerWeek] = useState(5);
  const max = 15;
  const crowd = 100;
  const weeks = stats?.pilot.weeks ?? PILOT_WEEKS;
  const per = stats?.perCup ?? PER_CUP;
  const cups = perWeek * weeks;
  const text = (g: number) => {
    const m = f.mass(g);
    return `${m.value} ${m.unit}`;
  };
  const plastic = f.mass(cups * per.plasticGrams);
  const co2 = f.mass(cups * per.co2eGrams);

  return (
    <section className="site-band site-band--yellow" id="impact" aria-labelledby="impact-title">
      <Wave />
      <div className="site-wrap">
        <SectionHead id="impact-title" label={c.label} title={c.title} center />
        <div className="site-calc">
          <div className="site-calc__controls">
            <label className="site-calc__label" htmlFor="site-per-week">
              {c.perWeek}
            </label>
            <output className="site-calc__value" htmlFor="site-per-week">
              {c.perWeekValue(perWeek)}
            </output>
            <input
              id="site-per-week"
              className="site-range"
              type="range"
              min={1}
              max={max}
              step={1}
              value={perWeek}
              onChange={(e) => setPerWeek(Number(e.target.value))}
              style={{ '--p': `${((perWeek - 1) / (max - 1)) * 100}%` } as CSSProperties}
            />
            <div className="site-calc__results" aria-live="polite">
              <div className="tn-green">
                <b>{f.num(cups)}</b>
                <span>{c.cups}</span>
              </div>
              <div className="tn-blue">
                <b>
                  <Qty value={plastic.value} unit={plastic.unit} />
                </b>
                <span>{c.plastic}</span>
              </div>
              <div className="tn-purple">
                <b>
                  <Qty value={co2.value} unit={co2.unit} />
                </b>
                <span>{c.co2}</span>
              </div>
            </div>
            <p className="site-calc__crowd">
              <Users size={22} strokeWidth={2.4} />
              <span>
                <b>{c.friends(crowd)}:</b> {f.num(cups * crowd)} {c.cups} · {text(cups * crowd * per.plasticGrams)} {c.plastic} · {text(cups * crowd * per.co2eGrams)} {c.co2}
              </span>
            </p>
          </div>
          <figure className="site-calc__chart">
            <div className="site-cupgrid" style={{ '--weeks': weeks } as CSSProperties} aria-hidden="true">
              {Array.from({ length: weeks }, (_, w) => (
                <span key={w}>
                  {Array.from({ length: max }, (_, k) => (
                    <i key={k} className={k < perWeek ? 'on' : ''} />
                  ))}
                </span>
              ))}
            </div>
            <figcaption>{c.chart(weeks)}</figcaption>
          </figure>
        </div>
        <p className="site-fineprint">{c.note(text(per.plasticGrams), text(per.co2eGrams))}</p>
      </div>
      <Wave bottom />
    </section>
  );
}

function Research() {
  const { t } = useI18n();
  const r = t.site.research;
  const questions: { tone: Tone; icon: ReactNode }[] = [
    { tone: 'green', icon: <ChartColumn size={22} strokeWidth={2.4} /> },
    { tone: 'purple', icon: <FlaskConical size={22} strokeWidth={2.4} /> },
    { tone: 'blue', icon: <Leaf size={22} strokeWidth={2.4} /> },
    { tone: 'yellow', icon: <Nfc size={22} strokeWidth={2.4} /> },
  ];
  return (
    <section className="site-section" id="research" aria-labelledby="research-title">
      <div className="site-wrap">
        <SectionHead id="research-title" label={r.label} title={r.title} body={r.body} />
        <div className="site-grid site-grid--2">
          {r.questions.map((q, i) => (
            <article key={q.q} className={`site-card site-q ${toneStyle(questions[i].tone)}`}>
              <div className="row">
                <IconChip tone={questions[i].tone} size="md">
                  {questions[i].icon}
                </IconChip>
                <span className="site-q__tag">{r.question(i + 1)}</span>
              </div>
              <h3>{q.q}</h3>
              <p>
                <b>{r.howLabel}:</b> {q.how}
              </p>
            </article>
          ))}
        </div>
        <div className="site-grid site-grid--2 site-research__more">
          <article className="site-secret">
            <Mascot size={96} mood="cheer" />
            <div>
              <h3>{r.secretTitle}</h3>
              <p>{r.secret}</p>
            </div>
          </article>
          <article className="site-card site-tiers">
            <h3>{r.tiersTitle}</h3>
            <ol>
              {r.tiers.map((tier, i) => (
                <li key={tier.title}>
                  <span className="site-tiers__n">{i + 1}</span>
                  <span className="grow">{tier.title}</span>
                  <span className={`site-tag ${i < 2 ? 'site-tag--ok' : 'site-tag--muted'}`}>
                    {i < 2 && <Check size={14} strokeWidth={3.4} />}
                    {tier.tag}
                  </span>
                </li>
              ))}
            </ol>
            <p className="site-note">{r.tiersNote}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function Roadmap({ today }: { today: string }) {
  const { t } = useI18n();
  const r = t.site.roadmap;
  const month = today.slice(0, 7);
  return (
    <section className="site-band site-band--blue" id="roadmap" aria-labelledby="roadmap-title">
      <Wave />
      <div className="site-wrap">
        <SectionHead id="roadmap-title" label={r.label} title={r.title} center />
        <ol className="site-road">
          {PHASES.map((phase, i) => {
            const state = month > phase.to ? 'done' : month >= phase.from ? 'now' : 'next';
            const Icon = phase.icon;
            const text = r.phases[i];
            return (
              <li key={phase.from} className={`site-road__item ${state}`} aria-current={state === 'now' ? 'step' : undefined}>
                <span className="site-road__disc" aria-hidden="true">
                  {state === 'done' ? <Check size={32} strokeWidth={3.4} /> : <Icon size={28} strokeWidth={2.4} />}
                </span>
                <div className="site-road__text">
                  {state === 'now' && (
                    <span className="site-road__now">
                      <Mascot size={34} /> {r.now}
                    </span>
                  )}
                  <span className="site-road__when">{text.when}</span>
                  <h3>{text.title}</h3>
                  <p>{text.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="site-callout site-callout--blue">
          <CalendarDays size={22} strokeWidth={2.4} />
          <span>{r.note}</span>
        </p>
      </div>
      <Wave bottom />
    </section>
  );
}

function Privacy() {
  const { t } = useI18n();
  const p = t.site.privacy;
  const items: { tone: Tone; icon: ReactNode }[] = [
    { tone: 'green', icon: <HeartHandshake size={24} strokeWidth={2.4} /> },
    { tone: 'blue', icon: <EyeOff size={24} strokeWidth={2.4} /> },
    { tone: 'purple', icon: <Download size={24} strokeWidth={2.4} /> },
    { tone: 'yellow', icon: <Smile size={24} strokeWidth={2.4} /> },
  ];
  return (
    <section className="site-section" aria-labelledby="privacy-title">
      <div className="site-wrap">
        <SectionHead id="privacy-title" label={p.label} title={p.title} />
        <div className="site-grid site-grid--4">
          {p.items.map((item, i) => (
            <article key={item.title} className="site-card site-card--icon">
              <IconChip tone={items[i].tone} size="lg">
                {items[i].icon}
              </IconChip>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
        <p className="site-ethics">
          <ShieldCheck size={24} strokeWidth={2.4} />
          <span>{p.ethics}</span>
        </p>
      </div>
    </section>
  );
}

function Outcomes() {
  const { t } = useI18n();
  const o = t.site.outcomes;
  const items: { tone: Tone; icon: ReactNode }[] = [
    { tone: 'green', icon: <Smartphone size={26} strokeWidth={2.4} /> },
    { tone: 'blue', icon: <ChartColumn size={26} strokeWidth={2.4} /> },
    { tone: 'purple', icon: <Database size={26} strokeWidth={2.4} /> },
    { tone: 'red', icon: <BookOpen size={26} strokeWidth={2.4} /> },
    { tone: 'yellow', icon: <Repeat size={26} strokeWidth={2.4} /> },
    { tone: 'green', icon: <GraduationCap size={26} strokeWidth={2.4} /> },
  ];
  return (
    <section className="site-section site-section--tint" aria-labelledby="outcomes-title">
      <div className="site-wrap">
        <SectionHead id="outcomes-title" label={o.label} title={o.title} center />
        <div className="site-grid site-grid--3">
          {o.items.map((item, i) => (
            <article key={item.title} className={`site-card site-card--icon site-outcome ${toneStyle(items[i].tone)}`}>
              <span className="site-tile" aria-hidden="true">
                {items[i].icon}
              </span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Team() {
  const { t } = useI18n();
  const tm = t.site.team;
  const groups: { tone: Tone; icon: ReactNode }[] = [
    { tone: 'purple', icon: <Microscope size={24} strokeWidth={2.4} /> },
    { tone: 'blue', icon: <Code size={24} strokeWidth={2.4} /> },
    { tone: 'red', icon: <Megaphone size={24} strokeWidth={2.4} /> },
    { tone: 'green', icon: <ChartColumn size={24} strokeWidth={2.4} /> },
  ];
  const sdgTones: Tone[] = ['red', 'yellow', 'blue', 'green', 'purple', 'blue'];
  return (
    <section className="site-section" aria-labelledby="team-title">
      <div className="site-wrap">
        <SectionHead id="team-title" label={tm.label} title={tm.title} body={tm.body} />
        <div className="site-grid site-grid--4">
          {tm.groups.map((g, i) => (
            <article key={g.title} className="site-card site-card--icon">
              <IconChip tone={groups[i].tone} size="lg">
                {groups[i].icon}
              </IconChip>
              <h3>{g.title}</h3>
              <p>{g.body}</p>
            </article>
          ))}
        </div>
        <div className="site-team__more">
          <div>
            <h3 className="site-subhead">{tm.partnersTitle}</h3>
            <ul className="site-partners">
              {tm.partners.map((p) => (
                <li key={p.name}>
                  <b>{p.name}</b>
                  <span>{p.role}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="site-subhead">{tm.sdgTitle}</h3>
            <ul className="site-sdgs">
              {tm.sdgs.map((s, i) => (
                <li key={s.n} className={toneStyle(sdgTones[i])}>
                  <b>{s.n}</b>
                  {s.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const { t } = useI18n();
  const q = t.site.faq;
  return (
    <section className="site-section" id="faq" aria-labelledby="faq-title">
      <div className="site-wrap site-faq">
        <SectionHead id="faq-title" label={q.label} title={q.title} center />
        <div className="site-faq__list">
          {q.items.map((item) => (
            <details key={item.q}>
              <summary>
                <span>{item.q}</span>
                <Plus size={22} strokeWidth={3} aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Finale() {
  const { t } = useI18n();
  const c = t.site.cta;
  const ft = t.site.footer;
  const join = useJoinLabel(c.button);
  return (
    <div className="site-final">
      <Wave />
      <section className="site-wrap site-final__in" aria-labelledby="cta-title">
        <Confetti />
        <Mascot size={140} mood="cheer" className="site-bob" />
        <h2 id="cta-title">{c.title}</h2>
        <p>{c.body}</p>
        <Link className="btn3d btn3d--yellow" to="/me">
          <span>{join}</span>
          <ArrowRight size={20} strokeWidth={3} />
        </Link>
        <div className="site-final__links">
          <Link to="/vendor">
            <Store size={18} strokeWidth={2.4} /> {c.vendor}
          </Link>
          <Link to="/admin">
            <ChartColumn size={18} strokeWidth={2.4} /> {c.console}
          </Link>
        </div>
      </section>
      <footer className="site-foot">
        <div className="site-wrap site-foot__in">
          <span className="site-logo">
            <Mascot size={26} />
            <span>One-Cup-Community</span>
          </span>
          <p>{ft.org}</p>
          <p>{ft.period}</p>
          <p className="site-foot__note">{ft.note}</p>
        </div>
      </footer>
    </div>
  );
}
