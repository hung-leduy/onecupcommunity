import { ChartColumn, Store, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LangSwitch, useI18n } from './i18n';
import { webNfcSupported } from './scan/webnfc';
import { IconChip } from './ui/kit';
import { Mascot } from './ui/Mascot';

export function Landing() {
  const { t } = useI18n();
  return (
    <main className="landing">
      <div className="row between">
        <div className="landing__hero">
          <Mascot size={78} />
          <div>
            <h1>One-Cup-Community</h1>
            <p className="muted" style={{ fontWeight: 800 }}>
              {t.landing.tagline}
            </p>
          </div>
        </div>
        <LangSwitch />
      </div>
      <div className="landing__cards">
        <Link className="landing__card" to="/me">
          <IconChip tone="green" size="lg">
            <User size={26} />
          </IconChip>
          <h2>{t.landing.student}</h2>
          <p>{t.landing.studentDesc}</p>
        </Link>
        <Link className="landing__card" to="/vendor">
          <IconChip tone="blue" size="lg">
            <Store size={26} />
          </IconChip>
          <h2>{t.landing.vendor}</h2>
          <p>{t.landing.vendorDesc}</p>
        </Link>
        <Link className="landing__card" to="/admin">
          <IconChip tone="purple" size="lg">
            <ChartColumn size={26} />
          </IconChip>
          <h2>{t.landing.console}</h2>
          <p>{t.landing.consoleDesc}</p>
        </Link>
      </div>
      <p className="muted small">
        {webNfcSupported() ? t.landing.nfcYes : t.landing.nfcNo} {window.isSecureContext ? '' : t.landing.insecure}
      </p>
    </main>
  );
}
