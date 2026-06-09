import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';

interface LessonCharge {
  id: string;
  class_id: string;
  headcount: number;
  per_head_aud_cents: number;
  hours: number;
  amount_aud_cents: number;
  paid_at: string | null;
  created_at: string;
  class?: { id: string; name: string };
}

const aud = (cents: number) => `A$${(cents / 100).toFixed(0)}`;

export function TutoringPage() {
  const me = useMe();
  const nav = useNavigate();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const [charges, setCharges] = useState<LessonCharge[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    api<LessonCharge[]>(`/tutoring/families/${familyId}/charges`)
      .then((c) => !cancelled && setCharges(c))
      .catch((e) => !cancelled && setError(e instanceof ApiError ? e.message : 'Could not load.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const pay = async () => {
    if (!familyId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ checkout_url: string }>(`/tutoring/families/${familyId}/pay`, { method: 'POST' });
      window.location.href = res.checkout_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start checkout.');
      setBusy(false);
    }
  };

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Private tutoring</div>
        <h1 className="section-heading">Set up your family first</h1>
        <button onClick={() => nav('/portal/register')} className="btn-pill-primary mt-6">Start setup →</button>
      </div>
    );
  }

  const outstanding = charges.filter((c) => !c.paid_at).reduce((s, c) => s + c.amount_aud_cents, 0);

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow">Private tutoring</div>
        <h1 className="section-heading">Tutoring bill</h1>
        <p className="lead-text mt-3">
          每节私教课按当节人数定价(人越多越便宜),按节计费。下面是你的账单。
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-coral/10 px-4 py-3 text-[14px] font-semibold text-coral">{error}</div>
      )}

      <div className="mb-8 rounded-3xl bg-surface p-6 shadow-sm">
        <div className="text-[12px] font-bold uppercase tracking-[0.14em] opacity-70">待付金额</div>
        <div className="mt-1 text-[44px] font-extrabold leading-none">{aud(outstanding)}</div>
        {outstanding > 0 && (
          <button onClick={pay} disabled={busy} className="btn-pill-primary mt-4">
            {busy ? '正在跳转…' : `去支付 ${aud(outstanding)}`}
          </button>
        )}
        {outstanding === 0 && !loading && <p className="lead-text mt-2">没有待付的课时,棒!</p>}
      </div>

      <h2 className="mb-4 text-[18px] font-bold">课时明细</h2>
      {loading ? (
        <p className="lead-text">Loading…</p>
      ) : charges.length === 0 ? (
        <p className="lead-text">还没有私教课时记录。</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-sm">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left opacity-60">
                <th className="p-3">班</th>
                <th className="p-3">人数</th>
                <th className="p-3">单价/小时</th>
                <th className="p-3">时长</th>
                <th className="p-3">金额</th>
                <th className="p-3">状态</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id} className="border-t border-hairline">
                  <td className="p-3 font-semibold">{c.class?.name ?? c.class_id}</td>
                  <td className="p-3">{c.headcount}</td>
                  <td className="p-3">{aud(c.per_head_aud_cents)}</td>
                  <td className="p-3">{c.hours}h</td>
                  <td className="p-3 font-semibold">{aud(c.amount_aud_cents)}</td>
                  <td className="p-3">
                    {c.paid_at ? (
                      <span className="rounded-full bg-mint/30 px-2 py-0.5 text-[12px] font-bold">已付</span>
                    ) : (
                      <span className="rounded-full bg-coral/20 px-2 py-0.5 text-[12px] font-bold text-coral">待付</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
