import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWsEvent } from '@/lib/useWsEvent';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { describeAuditEvent, friendlyActor, type AuditTone } from '@/lib/auditCopy';
// Shared cross-product contract (audit-event-schema-prd v0.2 §3.2) — the /types
// subpath is type-only, so no Zod lands in the bundle.
import type { AuditEventRecord as AuditEvent } from '@airbotix-ai/audit-schema/types';

// occurred_at is the emitter's clock and optional on the wire; received_at
// (server clock) is always present (§3.8).
function eventTime(event: AuditEvent): string {
  return new Date(event.occurred_at ?? event.received_at).toLocaleString();
}

// Tone → leading-bubble background. Tailwind can't see dynamic class names, so
// map each tone to a static class string.
const TONE_BUBBLE: Record<AuditTone, string> = {
  coral: 'bg-wash-coral',
  bubblegum: 'bg-wash-bubblegum',
  sunshine: 'bg-wash-sunshine',
  sky: 'bg-wash-sky',
  mint: 'bg-wash-mint',
  slate: 'bg-surface-soft',
};

export function AuditPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const qc = useQueryClient();
  useWsEvent('audit.event', () => { qc.invalidateQueries({ queryKey: ['audit', 'family', familyId] }); }, [familyId]);

  const audit = useQuery<AuditEvent[]>({
    queryKey: ['audit', 'family', familyId],
    queryFn: () => api<AuditEvent[]>(`/families/${familyId}/audit`),
    enabled: !!familyId,
  });

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Activity</div>
        <h1 className="section-heading">Set up your family first</h1>
        <Link to="/portal/register" className="btn-pill-primary mt-6">Start setup →</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow eyebrow-sky">Activity</div>
        <h1 className="section-heading">Everything that happened</h1>
        <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
          A plain-language record of every top-up, AI request, and approval in your family — newest first.
        </p>
      </div>

      {audit.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : audit.data && audit.data.length > 0 ? (
        <AuditTimeline events={audit.data} />
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sky">Quiet</span>
          <p className="lead-text mt-4">No events yet. Activity will appear here in real time.</p>
        </div>
      )}
    </div>
  );
}

export function AuditTimeline({ events }: { events: AuditEvent[] }) {
  return (
    <div className="card-base p-0 overflow-hidden">
      <ul className="divide-y divide-hairline">
        {events.map((event) => (
          <AuditRow key={event.id} event={event} />
        ))}
      </ul>
    </div>
  );
}

interface SafetySummary {
  total: number;
  window_sec: number;
  start_at: string;
  end_at: string;
  categories: { key: string; label: string; icon: string; count: number }[];
}

function SafetyEscalatedRow({ event }: { event: AuditEvent }) {
  const [open, setOpen] = useState(false);
  const familyId = event.family_id;
  const kidId = event.kid_id;
  const windowSec = (event.payload?.['window_sec'] as number | undefined) ?? 3600;

  const summary = useQuery<SafetySummary>({
    queryKey: ['safety-summary', familyId, kidId, windowSec],
    queryFn: () =>
      api<SafetySummary>(`/families/${familyId}/kids/${kidId}/safety-summary?window_sec=${windowSec}`),
    enabled: open && !!familyId && !!kidId,
  });

  return (
    <li className="px-6 py-4 bg-wash-coral/30">
      <div className="flex items-start gap-4">
        <span
          className="bg-wash-coral shrink-0 grid place-items-center rounded-2xl"
          style={{ width: 40, height: 40, fontSize: 20, lineHeight: 1 }}
          aria-hidden="true"
        >
          📣
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-ink">Repeated safety triggers</div>
          <div className="text-[13px] text-ink-soft mt-0.5">
            Multiple safety events in a short period — teacher was notified.
          </div>
          <div className="text-[12px] text-slate2 mt-1.5">
            {friendlyActor(event.actor)} · {eventTime(event)}
          </div>
          <button
            type="button"
            className="mt-2 text-[12px] font-semibold text-brand-coral hover:underline"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? 'Hide details ▾' : 'See what they tried ▸'}
          </button>
          {open && (
            <div className="mt-3 card-base bg-wash-coral/20 p-4">
              {summary.isLoading ? (
                <p className="text-[13px] text-slate2">Loading…</p>
              ) : summary.data && summary.data.total > 0 ? (
                <>
                  <div className="text-[13px] font-bold text-ink mb-2">
                    {summary.data.total} block{summary.data.total !== 1 ? 's' : ''} in the last {Math.round(windowSec / 60)} minutes
                  </div>
                  <ul className="space-y-1 mb-3">
                    {summary.data.categories.map((cat) => (
                      <li key={cat.key} className="flex items-center gap-2 text-[13px] text-ink">
                        <span>{cat.icon}</span>
                        <span className="font-medium">{cat.label}</span>
                        <span className="text-slate2">×{cat.count}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="text-[11px] text-slate2">
                    {new Date(summary.data.start_at).toLocaleTimeString()} –{' '}
                    {new Date(summary.data.end_at).toLocaleTimeString()}
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    <a
                      href="https://www.esafety.gov.au/parents/big-issues/online-safety-conversations"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-pill-ghost text-[12px]"
                    >
                      How to talk to your child →
                    </a>
                  </div>
                </>
              ) : (
                <p className="text-[13px] text-slate2">No recent rejection details available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function AuditRow({ event }: { event: AuditEvent }) {
  if (event.event_type === 'safety.pattern.escalated') {
    return <SafetyEscalatedRow event={event} />;
  }

  const copy = describeAuditEvent(event);
  const hasPayload = event.payload && Object.keys(event.payload).length > 0;

  return (
    <li className="px-6 py-4">
      <div className="flex items-start gap-4">
        <span
          className={`${TONE_BUBBLE[copy.tone]} shrink-0 grid place-items-center rounded-2xl`}
          style={{ width: 40, height: 40, fontSize: 20, lineHeight: 1 }}
          aria-hidden="true"
        >
          {copy.icon}
        </span>

        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-ink">{copy.title}</div>
          {copy.detail && (
            <div className="text-[13px] text-ink-soft mt-0.5">{copy.detail}</div>
          )}

          <div className="text-[12px] text-slate2 mt-1.5">
            {friendlyActor(event.actor)}
            {' · '}
            {eventTime(event)}
            {event.project_id && (
              <>
                {' · '}
                <Link
                  to={`/portal/audit/project/${event.project_id}`}
                  className="font-semibold text-brand-coral hover:underline"
                >
                  view project →
                </Link>
              </>
            )}
          </div>

          {hasPayload && (
            <details className="mt-2 group">
              <summary className="text-[11px] text-steel cursor-pointer select-none hover:text-slate2 list-none">
                <span className="group-open:hidden">Technical details ▸</span>
                <span className="hidden group-open:inline">Technical details ▾</span>
              </summary>
              <pre className="text-[12px] text-ink-soft mt-2 bg-surface-soft p-3 rounded-xl overflow-x-auto font-mono">
                {event.event_type}
                {'\n'}
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    </li>
  );
}
