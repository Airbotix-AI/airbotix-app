import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { AuditTimeline } from './AuditPage';

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

export function AuditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const audit = useQuery<AuditEvent[]>({
    queryKey: ['audit', 'project', id],
    queryFn: () => api<AuditEvent[]>(`/projects/${id}/audit`),
    enabled: !!id,
  });

  return (
    <div>
      <Link to="/portal/audit" className="btn-pill-ghost mb-4 -ml-3">← Activity</Link>
      <div className="mb-8">
        <div className="eyebrow eyebrow-sky">Project trace</div>
        <h1 className="section-heading">Replay this project</h1>
        <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
          Every prompt, every AI response, every Star spent — in order.
        </p>
      </div>

      {audit.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : audit.data && audit.data.length > 0 ? (
        <AuditTimeline events={audit.data} />
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sky">No trace</span>
          <p className="lead-text mt-4">This project has no audit events.</p>
        </div>
      )}
    </div>
  );
}
