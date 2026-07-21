import { Link } from 'react-router-dom';

import { formatAud } from '@/lib/money';
import { dateTimeLabel, type PortalVenue, venueLabel } from './myClasses';

// Shared shape + card for a bookable class returned by `GET /class-seats/classes`.
// Rendered on both the Dashboard "Now enrolling" panel and the Find-a-class page,
// so a class looks and links the same wherever a parent first sees it.
export interface AvailableClass {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  seats_remaining: number;
  max_students: number;
  delivery_mode: string;
  venue: PortalVenue | null;
  course_total_aud_cents: number | null;
  session_count: number | null;
  session_minutes: number | null;
  course_pack: { id: string; slug: string; title: string } | null;
}

export function ClassCard({ item }: { item: AvailableClass }) {
  return (
    <article className="rounded-2xl border border-hairline bg-canvas-pure p-6 shadow-card-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate2">
            {item.course_pack?.title ?? 'Airbotix class'}
          </div>
          <h2 className="mt-2 text-[22px] font-bold leading-tight text-ink">{item.name}</h2>
        </div>
        {item.course_total_aud_cents != null && (
          <div className="rounded-2xl bg-wash-mint px-4 py-2 text-right">
            <div className="text-[20px] font-extrabold text-ink">
              {formatAud(item.course_total_aud_cents)}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate2">
              whole course
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact label="Starts" value={dateTimeLabel(item.starts_at)} />
        <Fact label="Where" value={venueLabel(item.venue)} />
        <Fact
          label="Seats"
          value={`${item.seats_remaining} of ${item.max_students} available`}
        />
        <Fact
          label="Format"
          value={
            item.session_count && item.session_minutes
              ? `${item.session_count} × ${item.session_minutes} min`
              : item.delivery_mode.replace(/_/g, ' ')
          }
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to={`/portal/checkout/class/${item.id}`} className="btn-pill-primary">
          Pay & lock a seat
        </Link>
        <Link to="/portal/courses" className="btn-pill-secondary">
          Ask first
        </Link>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <div className="text-[11px] font-bold uppercase tracking-[0.10em] text-slate2">{label}</div>
      <div className="mt-1 text-[14px] font-semibold text-ink">{value}</div>
    </div>
  );
}
