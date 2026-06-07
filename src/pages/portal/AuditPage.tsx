import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWsEvent } from '@/lib/useWsEvent';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { describeAuditEvent, friendlyActor, type AuditTone } from '@/lib/auditCopy';

interface AuditEvent {
  id: string;
  family_id: string | null;
  kid_id: string | null;
  project_id: string | null;
  actor: 'kid' | 'agent' | 'parent' | 'teacher' | 'admin' | 'super_admin' | 'system' | 'service';
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  occurred_at: string;
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

function AuditRow({ event }: { event: AuditEvent }) {
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
            {new Date(event.occurred_at).toLocaleString()}
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
