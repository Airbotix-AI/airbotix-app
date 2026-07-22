import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { useMe } from '@/auth/useAuth';
import { api } from '@/lib/api';
import { bookingStatusCopy, dateTimeLabel, type MyClassesResponse, venueLabel } from './myClasses';
import { TeachingTeam } from './teachers/TeachingTeam';

export function MyClassesPanel({ compact = false }: { compact?: boolean }) {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const myClasses = useQuery<MyClassesResponse>({
    queryKey: ['families', familyId, 'my-classes'],
    queryFn: () => api<MyClassesResponse>(`/families/${familyId}/my-classes`),
    enabled: !!familyId,
  });

  if (!familyId) return null;

  const enrollments = myClasses.data?.enrollments ?? [];
  const pending = myClasses.data?.pending_orders ?? [];
  const requests = myClasses.data?.booking_requests ?? [];
  const hasAnything = enrollments.length + pending.length + requests.length > 0;

  return (
    <section className={compact ? 'mb-8' : 'mb-10'}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="eyebrow eyebrow-mint">My classes</div>
          <h2 className="text-[28px] font-bold leading-tight text-ink">Booked and requested</h2>
        </div>
        <Link to="/portal/classes" className="btn-pill-ghost">
          Find a class
        </Link>
      </div>

      {myClasses.isLoading && <p className="lead-text">Loading your classes…</p>}

      {!myClasses.isLoading && myClasses.isError && (
        <div className="rounded-2xl border border-hairline bg-canvas-pure px-5 py-4">
          <p className="text-[15px] font-semibold text-ink">We couldn’t load your bookings.</p>
          <p className="mt-1 text-[13px] text-slate2">
            This is a temporary hiccup on our side — your bookings are safe. Please try again.
          </p>
          <button type="button" onClick={() => myClasses.refetch()} className="btn-pill-ghost mt-3">
            Retry
          </button>
        </div>
      )}

      {!myClasses.isLoading && !myClasses.isError && !hasAnything && (
        <div className="rounded-2xl border border-hairline bg-canvas-pure px-5 py-4">
          <p className="text-[15px] font-semibold text-ink">No bookings yet.</p>
          <p className="mt-1 text-[13px] text-slate2">
            Pick your city and lock a seat when you find the right time.
          </p>
        </div>
      )}

      {hasAnything && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {enrollments.slice(0, compact ? 2 : 4).map((item) => (
            <div key={item.id} className="rounded-2xl border border-hairline bg-canvas-pure p-4">
              <span className="sticker-mint">Locked</span>
              <h3 className="mt-4 text-[17px] font-bold leading-snug">{item.class.name}</h3>
              <p className="mt-2 text-[13px] font-semibold text-ink-soft">
                {item.kid.nickname} · {dateTimeLabel(item.class.starts_at)}
              </p>
              <p className="mt-1 text-[12px] text-slate2">{venueLabel(item.class.venue)}</p>
              <p className="mt-3 text-[12px] text-slate2">
                <span className="mr-1 font-bold text-ink">Teacher:</span>
                <TeachingTeam team={item.class.teaching_team ?? []} />
              </p>
            </div>
          ))}

          {pending.slice(0, compact ? 1 : 3).map((item) => (
            <div
              key={item.payment_intent_id}
              className="rounded-2xl border border-hairline bg-canvas-pure p-4"
            >
              <span className="sticker-sunshine">Payment open</span>
              <h3 className="mt-4 text-[17px] font-bold leading-snug">
                {item.class?.name ?? 'Class seat'}
              </h3>
              <p className="mt-2 text-[13px] text-slate2">
                Finish the checkout you started. If you already paid, the seat locks after
                confirmation.
              </p>
              {item.class && (
                <Link
                  to={`/portal/checkout/class/${item.class.id}`}
                  className="btn-pill-primary mt-4 w-full"
                >
                  Resume checkout
                </Link>
              )}
            </div>
          ))}

          {requests.slice(0, compact ? 2 : 4).map((item) => (
            <div key={item.id} className="rounded-2xl border border-hairline bg-canvas-pure p-4">
              <span className="sticker-sky alt">
                {bookingStatusCopy[item.parent_status] ?? 'Received'}
              </span>
              <h3 className="mt-4 text-[17px] font-bold leading-snug">
                {item.course_pack?.title ?? 'Class request'}
              </h3>
              <p className="mt-2 text-[13px] text-slate2">
                {item.parent_status === 'received'
                  ? 'We received it and will contact you within 1 business day.'
                  : item.parent_status === 'contacted'
                    ? 'Our team has contacted you about this request.'
                    : item.parent_status === 'confirmed'
                      ? 'This request has become a confirmed class.'
                      : 'This request is closed.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
