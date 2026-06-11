import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { AuditTimeline } from './AuditPage';
// Shared cross-product contract (audit-event-schema-prd v0.2 §3.2), type-only import.
import type { AuditEventRecord as AuditEvent } from '@airbotix-ai/audit-schema/types';

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
