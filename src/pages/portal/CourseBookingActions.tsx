import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { api, ApiError } from '@/lib/api';

import { COURSE_CTA_SIZE } from './courseCtaStyles';
import type { CoursePack, Kid } from './courseComparison';

interface MarketingClass {
  id: string;
  name: string;
  starts_at: string;
  seats_remaining: number;
  venue: { name: string; suburb: string } | null;
  course_total_aud_cents: number | null;
  purchasable?: boolean;
}

interface CourseBookingActionsProps {
  pack: CoursePack;
  kids: Kid[];
  suggestedKidId: string;
  familyId: string | null;
  contactEmail?: string;
}

const classDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function CourseBookingActions({
  pack,
  kids,
  suggestedKidId,
  familyId,
  contactEmail,
}: CourseBookingActionsProps) {
  const [requestOpen, setRequestOpen] = useState(false);
  const [showTimes, setShowTimes] = useState(false);
  const [kidId, setKidId] = useState(suggestedKidId);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestOpen) setKidId(suggestedKidId);
  }, [requestOpen, suggestedKidId]);

  const classes = useQuery<MarketingClass[]>({
    queryKey: ['courses', pack.slug, 'classes'],
    queryFn: () => api<MarketingClass[]>(`/courses/${pack.slug}/classes`),
    enabled: showTimes,
  });
  const purchasable = (classes.data ?? []).filter(
    (item) => item.purchasable && item.course_total_aud_cents != null,
  );

  const enroll = useMutation({
    mutationFn: () =>
      api('/bookings', {
        method: 'POST',
        body: {
          source: 'parent_portal',
          type: 'course_enrollment',
          family_id: familyId,
          kid_id: kidId || undefined,
          course_pack_id: pack.id,
          contact_email: contactEmail,
          notes: notes || undefined,
        },
      }),
    onError: (caught: unknown) =>
      setError(caught instanceof ApiError ? caught.message : 'Could not send request.'),
    onSuccess: () => setError(null),
  });

  return (
    <div className="border-t border-hairline bg-wash-sky/30 px-4 py-4 lg:px-5">
      <p className="text-[13px] font-semibold text-ink-soft">
        Ready to continue? Check scheduled classes and pay online, or ask us to help find a seat.
      </p>

      <div className="mt-3 grid gap-2 sm:w-[360px] sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setRequestOpen((open) => !open)}
          className={`btn-pill-secondary ${COURSE_CTA_SIZE}`}
        >
          {requestOpen ? 'Close request' : 'Request a seat →'}
        </button>
        <button
          type="button"
          onClick={() => setShowTimes((open) => !open)}
          className={`btn-pill-primary ${COURSE_CTA_SIZE}`}
        >
          {showTimes ? 'Hide class times' : 'See class times'}
        </button>
      </div>

      {enroll.isSuccess && (
        <div className="mt-4 rounded-2xl bg-brand-mint/15 px-4 py-3 text-[13px] font-semibold text-ink">
          ✓ Request sent — we’ll confirm a seat by email.
        </div>
      )}

      {requestOpen && !enroll.isSuccess && (
        <div className="mt-4 grid gap-3 rounded-2xl border border-hairline bg-canvas-pure p-4 md:grid-cols-2">
          <label className="block">
            <span className="label-k12">Which kid?</span>
            <select
              className="input-k12"
              value={kidId}
              onChange={(event) => setKidId(event.target.value)}
            >
              <option value="">Not sure yet</option>
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.nickname} (age {kid.age})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label-k12">Anything else? (optional)</span>
            <textarea
              className="input-k12"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Preferred days/times, questions…"
            />
          </label>
          {error && (
            <div className="text-[13px] font-semibold text-danger-600 md:col-span-2">{error}</div>
          )}
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={() => enroll.mutate()}
              disabled={enroll.isPending}
              className="btn-pill-primary"
            >
              {enroll.isPending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </div>
      )}

      {showTimes && classes.isLoading && (
        <p className="mt-4 text-[13px] text-slate2">Loading class times…</p>
      )}
      {showTimes && !classes.isLoading && purchasable.length === 0 && (
        <p className="mt-4 text-[13px] text-slate2">
          No classes are open for online purchase yet — request a seat and we'll be in touch.
        </p>
      )}
      {showTimes && purchasable.length > 0 && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {purchasable.map((item) => (
            <div key={item.id} className="rounded-2xl border border-hairline bg-canvas-pure p-4">
              <div className="text-[14px] font-bold text-ink">{item.name}</div>
              <div className="mt-1 text-[12px] text-slate2">
                Starts {classDateLabel(item.starts_at)}
              </div>
              {item.venue && (
                <div className="mt-1 text-[12px] text-slate2">
                  {item.venue.name}, {item.venue.suburb}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[16px] font-bold text-ink">
                    A${(item.course_total_aud_cents ?? 0) / 100}
                  </div>
                  <div className="text-[11px] text-slate2">{item.seats_remaining} seats left</div>
                </div>
                <Link to={`/portal/checkout/class/${item.id}`} className="btn-pill-primary">
                  Pay now &amp; lock a seat
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
