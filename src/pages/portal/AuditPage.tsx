import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useWsEvent } from '@/lib/useWsEvent';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';

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

const ACTOR_STICKER: Record<string, string> = {
  kid: 'bubblegum',
  agent: 'sky',
  parent: 'coral',
  teacher: 'sunshine',
  admin: 'mint',
  super_admin: 'mint',
  system: 'sky',
  service: 'sky',
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
          Every AI call, every wallet move, every approval — auditable, replay-able.
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
        {events.map((e) => {
          const sticker = ACTOR_STICKER[e.actor] ?? 'sky';
          return (
            <li key={e.id} className="px-6 py-4">
              <div className="flex items-start gap-4">
                <span className={`sticker-${sticker} shrink-0 mt-0.5`} style={{ transform: 'rotate(-2deg)' }}>
                  {e.actor}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-ink truncate">{e.event_type}</div>
                  {e.payload && Object.keys(e.payload).length > 0 && (
                    <pre className="text-[12px] text-ink-soft mt-2 bg-surface-soft p-3 rounded-xl overflow-x-auto font-mono">
                      {JSON.stringify(e.payload, null, 2)}
                    </pre>
                  )}
                  <div className="text-[12px] text-slate2 mt-2">
                    {new Date(e.occurred_at).toLocaleString()}
                    {e.kid_id && ` · kid ${e.kid_id.slice(-6)}`}
                    {e.project_id && (
                      <>
                        {' · '}
                        <Link
                          to={`/portal/audit/project/${e.project_id}`}
                          className="font-semibold text-brand-coral hover:underline"
                        >
                          project →
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
