import { Info, Store, Ticket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, type Rewards as RewardsData, type Voucher } from '../api';
import { QrImage } from '../QrImage';
import { errorText, useI18n } from '../i18n';
import { GemIcon } from '../ui/icons';
import { Btn3D, IconChip, Sheet } from '../ui/kit';
import { useSession } from './session';
import { StudentShell } from './Shell';

export function Rewards() {
  return (
    <StudentShell>
      <RewardsBody />
    </StudentShell>
  );
}

function RewardsBody() {
  const { token, reload } = useSession();
  const { t, f, lang } = useI18n();
  const [data, setData] = useState<RewardsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    api<RewardsData>('/api/me/rewards', { token }).then(setData, (e) => setError(errorText(t, e)));
  }, [token, t]);

  const title = (x: { titleVi: string; titleEn: string }) => (lang === 'vi' ? x.titleVi : x.titleEn);

  async function redeem(item: RewardsData['items'][number]) {
    if (!confirm(t.rewards.confirm(title(item), item.cost))) return;
    try {
      const r = await api<RewardsData & { voucher: Voucher }>('/api/me/redemptions', { token, body: { rewardId: item.id } });
      setData(r);
      setVoucher(r.voucher);
      reload();
    } catch (e) {
      setError(errorText(t, e));
    }
  }

  if (!data) return error ? <p className="error-box">{error}</p> : <p className="muted">{t.common.loading}</p>;
  const note = t.rewards.note(f.date(data.rewardsEnd));

  return (
    <>
      <h1 className="st-title">{t.rewards.title}</h1>
      <div className="st-balance">
        <GemIcon size={48} />
        <b>{f.num(data.balance)}</b>
        <span>{t.rewards.balance}</span>
      </div>
      {error && <p className="error-box">{error}</p>}

      <h2>{t.rewards.available}</h2>
      <div className="stack" style={{ gap: 10 }}>
        {data.items.map((item) => (
          <div key={item.id} className="card st-reward">
            <IconChip tone={item.affordable && data.open ? 'green' : 'gray'} size="lg">
              <Store size={24} />
            </IconChip>
            <div className="grow">
              <b>{title(item)}</b>
              <span>
                <GemIcon size={15} /> <b>{item.cost}</b> · {item.vendor ?? t.rewards.anyVendor}
              </span>
            </div>
            {item.affordable && data.open ? (
              <Btn3D className="sm" onClick={() => redeem(item)}>
                {t.rewards.redeem}
              </Btn3D>
            ) : (
              <Btn3D className="sm" tone="gray" disabled>
                {t.rewards.notEnough}
              </Btn3D>
            )}
          </div>
        ))}
      </div>

      <div className="warn-box">
        <Info size={20} />
        <span>
          {data.open ? (
            <>
              {note[0]}
              <b>{note[1]}</b>
              {note[2]}
            </>
          ) : (
            t.rewards.closed(f.date(data.rewardsEnd))
          )}
        </span>
      </div>

      {data.vouchers.length > 0 && (
        <>
          <h2>{t.rewards.vouchers}</h2>
          <div className="stack" style={{ gap: 8 }}>
            {data.vouchers.map((v) => (
              <button key={v.id} className={`card st-voucher ${v.status === 'used' ? 'used' : ''}`} onClick={() => setVoucher(v)}>
                <IconChip tone={v.status === 'used' ? 'gray' : 'purple'}>
                  <Ticket size={20} />
                </IconChip>
                <div className="grow">
                  <b>{title(v)}</b>
                  <div className="small muted">
                    {v.displayCode} · {v.status === 'used' ? t.rewards.used : t.rewards.unused}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <Sheet open={!!voucher} onClose={() => setVoucher(null)} title={voucher ? title(voucher) : ''}>
        {voucher && (
          <div className="stack center">
            <QrImage value={voucher.url} size={220} label={voucher.displayCode} />
            <span className="voucher-code">{voucher.displayCode}</span>
            <p className="muted">
              {voucher.status === 'used' ? t.rewards.used : t.rewards.showAtCounter}
              {voucher.vendor ? ` · ${t.rewards.at(voucher.vendor)}` : ''}
            </p>
          </div>
        )}
      </Sheet>
    </>
  );
}
