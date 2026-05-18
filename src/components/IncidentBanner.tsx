import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useWsEvent } from '@/lib/useWsEvent';

interface IncidentEvent {
  id: string;
  kind: string;
  severity: 'low' | 'medium' | 'high';
  title: string;
  opened_at: string;
}

const KIND_LABEL: Record<string, string> = {
  moderation_spike: 'Repeated content rejections',
  wallet_anomaly: 'Unusual Stars spending',
  family_paused: 'Family paused',
  deeprouter_errors: 'AI service issue',
  manual: 'Flagged by team',
};

/**
 * Renders a dismissible alert when the backend opens a HIGH-severity incident
 * on this family (compliance C13). Backend emits `family.incident_opened` only
 * for HIGH severity — we don't filter again here, but the type guard keeps us
 * robust if the contract changes.
 */
export function IncidentBanner() {
  const [active, setActive] = useState<IncidentEvent | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());

  useWsEvent<IncidentEvent>('family.incident_opened', (payload) => {
    if (!payload?.id || dismissed.has(payload.id)) return;
    setActive(payload);
  });

  if (!active) return null;

  return (
    <div className="sticky top-0 z-50 border-b-2 border-brand-coral/30 bg-wash-coral px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center gap-4">
        <span className="sticker-coral shrink-0">Alert</span>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-bold text-ink truncate">
            {KIND_LABEL[active.kind] ?? active.kind}
          </div>
          <div className="text-[12px] text-ink-soft truncate">{active.title}</div>
        </div>
        <Link to="/portal/audit" className="btn-pill-secondary shrink-0">
          View activity
        </Link>
        <button
          type="button"
          onClick={() => {
            setDismissed((prev) => new Set(prev).add(active.id));
            setActive(null);
          }}
          aria-label="Dismiss alert"
          className="shrink-0 rounded-full px-3 py-1 text-[13px] font-semibold text-ink-soft hover:bg-brand-coral/10"
        >
          ×
        </button>
      </div>
    </div>
  );
}
