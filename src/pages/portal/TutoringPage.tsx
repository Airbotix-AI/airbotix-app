import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { formatAud } from '@/lib/money';

import { startHostedCheckout } from './airwallex';

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

interface FamilyClass {
  kid: { id: string; nickname: string };
  class: { id: string; name: string; delivery_mode: string };
  teachers: { display_name: string | null; email: string; role: string }[];
  upcoming_sessions: { scheduled_start: string; scheduled_end: string }[];
  lessons: { title: string; description: string; order_index: number }[];
  outline_published: boolean;
}

const sessionLabel = (iso: string, endIso: string) =>
  `${new Date(iso).toLocaleString('en-AU', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}–${new Date(endIso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`;

export function TutoringPage() {
  const me = useMe();
  const nav = useNavigate();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const [charges, setCharges] = useState<LessonCharge[]>([]);
  const [classes, setClasses] = useState<FamilyClass[]>([]);
  const [openOutline, setOpenOutline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    Promise.all([
      api<LessonCharge[]>(`/tutoring/families/${familyId}/charges`),
      api<FamilyClass[]>(`/tutoring/families/${familyId}/classes`),
    ])
      .then(([c, cl]) => {
        if (cancelled) return;
        setCharges(c);
        setClasses(cl);
      })
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
      const res = await api<{
        payment_intent_id?: string;
        client_secret?: string;
        checkout_url: string;
      }>(`/tutoring/families/${familyId}/pay`, { method: 'POST' });
      await startHostedCheckout(res);
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
          Each private tutoring lesson is priced by that session's headcount (more students, lower per-head price) and billed per lesson. Here's your bill.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl bg-coral/10 px-4 py-3 text-[14px] font-semibold text-coral">{error}</div>
      )}

      {/* Class cards: teachers / schedule / outline */}
      {classes.length > 0 && (
        <div className="mb-8 space-y-4">
          <h2 className="text-[18px] font-bold">Your classes</h2>
          {classes.map((fc) => {
            const key = `${fc.class.id}:${fc.kid.id}`;
            return (
              <div key={key} className="rounded-3xl bg-surface p-6 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[17px] font-bold">{fc.class.name}</span>
                  <span className="rounded-full bg-mint/30 px-2 py-0.5 text-[11px] font-bold uppercase">
                    {fc.class.delivery_mode === 'private_tutoring' ? 'Private' : 'Official'}
                  </span>
                  <span className="text-[13px] opacity-60">· {fc.kid.nickname}'s class</span>
                </div>
                {fc.teachers.length > 0 && (
                  <p className="mt-2 text-[14px]">
                    <span className="opacity-60">Teachers:</span>{' '}
                    {fc.teachers.map((t) => t.display_name ?? t.email).join(', ')}
                  </p>
                )}
                <div className="mt-3">
                  <div className="text-[12px] font-bold uppercase tracking-[0.14em] opacity-70">Upcoming sessions</div>
                  {fc.upcoming_sessions.length > 0 ? (
                    <ul className="mt-1 space-y-1 text-[14px]">
                      {fc.upcoming_sessions.slice(0, 5).map((s) => (
                        <li key={s.scheduled_start}>📅 {sessionLabel(s.scheduled_start, s.scheduled_end)}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[14px] opacity-60">No sessions scheduled yet — they'll show up here once the teacher schedules them.</p>
                  )}
                </div>
                {fc.outline_published && fc.lessons.length > 0 && (
                  <div className="mt-3">
                    <button
                      onClick={() => setOpenOutline(openOutline === key ? null : key)}
                      className="text-[14px] font-semibold text-coral"
                    >
                      {openOutline === key ? 'Hide course outline ▲' : `View course outline (${fc.lessons.length} lessons) ▼`}
                    </button>
                    {openOutline === key && (
                      <ol className="mt-2 space-y-1.5 text-[14px]">
                        {fc.lessons.map((l, i) => (
                          <li key={l.order_index} className="flex gap-2">
                            <span className="font-bold opacity-50">{i + 1}.</span>
                            <span>
                              <span className="font-semibold">{l.title}</span>
                              {l.description && <span className="opacity-60"> — {l.description}</span>}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-8 rounded-3xl bg-surface p-6 shadow-sm">
        <div className="text-[12px] font-bold uppercase tracking-[0.14em] opacity-70">Amount due</div>
        <div className="mt-1 text-[44px] font-extrabold leading-none">{formatAud(outstanding)}</div>
        {outstanding > 0 && (
          <button onClick={pay} disabled={busy} className="btn-pill-primary mt-4">
            {busy ? 'Redirecting…' : `Pay ${formatAud(outstanding)}`}
          </button>
        )}
        {outstanding === 0 && !loading && <p className="lead-text mt-2">You're all caught up — nothing due!</p>}
      </div>

      <h2 className="mb-4 text-[18px] font-bold">Lesson charges</h2>
      {loading ? (
        <p className="lead-text">Loading…</p>
      ) : charges.length === 0 ? (
        <p className="lead-text">No private tutoring charges yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-sm">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="text-left opacity-60">
                <th className="p-3">Class</th>
                <th className="p-3">Students</th>
                <th className="p-3">Rate/hour</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {charges.map((c) => (
                <tr key={c.id} className="border-t border-hairline">
                  <td className="p-3 font-semibold">{c.class?.name ?? c.class_id}</td>
                  <td className="p-3">{c.headcount}</td>
                  <td className="p-3">{formatAud(c.per_head_aud_cents)}</td>
                  <td className="p-3">{c.hours}h</td>
                  <td className="p-3 font-semibold">{formatAud(c.amount_aud_cents)}</td>
                  <td className="p-3">
                    {c.paid_at ? (
                      <span className="rounded-full bg-mint/30 px-2 py-0.5 text-[12px] font-bold">Paid</span>
                    ) : (
                      <span className="rounded-full bg-coral/20 px-2 py-0.5 text-[12px] font-bold text-coral">Due</span>
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
