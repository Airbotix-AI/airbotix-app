import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { MyClassesPanel } from './MyClassesPanel';

// A pack's course content is its list of Lessons (课节). The card shows the lesson
// count (= lessons.length), not the total Mission-task count (mission_count).
interface Lesson {
  id: string;
}

interface CoursePack {
  id: string;
  slug: string;
  title: string;
  description: string;
  target_age_min: number;
  target_age_max: number;
  product_line: 'line_a_creative' | 'line_b_coding';
  lessons: Lesson[];
  estimated_stars: number;
  owner_teacher: { id: string; display_name: string | null } | null;
}

interface Kid {
  id: string;
  nickname: string;
  age: number;
}

// Per-class row from the public marketing endpoint `GET /courses/:slug/classes`
// (only the fields the pay-now CTA needs). `purchasable` is computed server-side
// (sellable total + seats + venue); rows without it stay reserve-only.
interface MarketingClass {
  id: string;
  name: string;
  starts_at: string;
  seats_remaining: number;
  venue: { name: string; suburb: string } | null;
  course_total_aud_cents: number | null;
  purchasable?: boolean;
}

const classDateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export function CoursesPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const contactEmail = me.data?.kind === 'user' ? me.data.email : undefined;

  // `bookable=true` = taught AND put on sale by owner. Without it this list also showed
  // content-ready drafts nobody has priced: the parent got a "Request a seat" button on a
  // course whose class times 404, and the enrolment landed in the DB anyway
  // (booking-enrollment-prd D-6). The learn-side catalog still lists every published
  // pack, so the query key MUST stay distinct from ['course-packs'] — same key, different
  // filter would let whichever page loaded first serve its cache to the other.
  const packs = useQuery<CoursePack[]>({
    queryKey: ['course-packs', 'bookable'],
    queryFn: () => api<CoursePack[]>('/course-packs?bookable=true'),
  });

  const kids = useQuery<Kid[]>({
    queryKey: ['families', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: !!familyId,
  });

  return (
    <div>
      <MyClassesPanel compact />

      <div className="mb-10">
        <div className="eyebrow eyebrow-bubblegum">Courses</div>
        <h1 className="hero-display">
          Find a <span className="squiggle-word">course</span> for your kid.
        </h1>
        <p className="lead-text mt-4">
          Browse our published courses and request a seat. Our team confirms availability within one
          business day.
        </p>
      </div>

      {packs.isLoading && <p className="lead-text">Loading…</p>}

      {!packs.isLoading && (packs.data?.length ?? 0) === 0 && (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Coming soon</span>
          <p className="lead-text mt-4">New courses are being added. Check back soon!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {(packs.data ?? []).map((p) => (
          <EnrollCard
            key={p.id}
            pack={p}
            kids={kids.data ?? []}
            familyId={familyId}
            contactEmail={contactEmail}
          />
        ))}
      </div>
    </div>
  );
}

function EnrollCard({
  pack,
  kids,
  familyId,
  contactEmail,
}: {
  pack: CoursePack;
  kids: Kid[];
  familyId: string | null;
  contactEmail?: string;
}) {
  const [open, setOpen] = useState(false);
  const [showTimes, setShowTimes] = useState(false);
  const [kidId, setKidId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pay-now CTA (class-seat-checkout-prd.md D-CSC-1): classes are fetched
  // lazily when the parent asks for times — the reserve flow above stays
  // untouched for families who want a human first.
  const classes = useQuery<MarketingClass[]>({
    queryKey: ['courses', pack.slug, 'classes'],
    queryFn: () => api<MarketingClass[]>(`/courses/${pack.slug}/classes`),
    enabled: showTimes,
  });
  const purchasable = (classes.data ?? []).filter(
    (c) => c.purchasable && c.course_total_aud_cents != null,
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
    onError: (e: unknown) => setError(e instanceof ApiError ? e.message : 'Could not send request.'),
    onSuccess: () => setError(null),
  });

  const cardColor = pack.product_line === 'line_a_creative' ? 'coral' : 'sky';

  return (
    <div className={`pack-card ${cardColor} block`}>
      <span className="pack-blob" />
      <div className="relative">
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
          Ages {pack.target_age_min}-{pack.target_age_max} ·{' '}
          {pack.product_line === 'line_a_creative' ? 'Creative' : 'Coding'}
        </div>
        <div className="mt-3 text-[24px] font-bold leading-tight">{pack.title}</div>
        <div className="mt-2 text-[13px] opacity-90 line-clamp-3">{pack.description}</div>
        <div className="mt-4 text-[13px] font-semibold opacity-90">
          {pack.lessons.length} {pack.lessons.length === 1 ? 'lesson' : 'lessons'} ·{' '}
          {pack.estimated_stars}★
        </div>
        {pack.owner_teacher && (
          <div className="mt-1 text-[12px] opacity-80">
            Teacher: {pack.owner_teacher.display_name ?? 'Airbotix staff'}
          </div>
        )}

        {enroll.isSuccess ? (
          <div className="mt-5 rounded-2xl bg-canvas-pure/25 backdrop-blur px-4 py-3 text-[13px] font-semibold">
            ✓ Request sent — we’ll confirm a seat by email.
          </div>
        ) : open ? (
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-[12px] font-bold uppercase tracking-[0.10em] opacity-85">
                Which kid?
              </span>
              <select
                className="mt-1 w-full rounded-2xl border-2 border-canvas-pure/40 bg-canvas-pure/20 px-3 py-2 text-[14px] font-semibold backdrop-blur focus:outline-none"
                value={kidId}
                onChange={(e) => setKidId(e.target.value)}
              >
                <option value="">Not sure yet</option>
                {kids.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nickname} (age {k.age})
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-bold uppercase tracking-[0.10em] opacity-85">
                Anything else? (optional)
              </span>
              <textarea
                className="mt-1 w-full rounded-2xl border-2 border-canvas-pure/40 bg-canvas-pure/20 px-3 py-2 text-[14px] backdrop-blur focus:outline-none"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferred days/times, questions…"
              />
            </label>
            {error && <div className="text-[13px] font-semibold">{error}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => enroll.mutate()}
                disabled={enroll.isPending}
                className="rounded-full bg-canvas-pure/90 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.10em] text-ink disabled:opacity-50"
              >
                {enroll.isPending ? 'Sending…' : 'Send request'}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-canvas-pure/20 px-4 py-2 text-[13px] font-bold uppercase tracking-[0.10em] backdrop-blur"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-6 rounded-full bg-canvas-pure/25 backdrop-blur px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em]"
          >
            Request a seat →
          </button>
        )}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowTimes((v) => !v)}
            className="text-[12px] font-bold uppercase tracking-[0.10em] underline underline-offset-2 opacity-90"
          >
            {showTimes ? 'Hide class times' : 'See class times'}
          </button>

          {showTimes && classes.isLoading && (
            <div className="mt-2 text-[13px] opacity-90">Loading class times…</div>
          )}
          {showTimes && !classes.isLoading && purchasable.length === 0 && (
            <div className="mt-2 text-[13px] opacity-90">
              No classes are open for online purchase yet — request a seat and we'll be in touch.
            </div>
          )}
          {showTimes && purchasable.length > 0 && (
            <div className="mt-2 space-y-2">
              {purchasable.map((c) => (
                <div key={c.id} className="rounded-2xl bg-canvas-pure/20 backdrop-blur px-4 py-3">
                  <div className="text-[13px] font-semibold">
                    {c.name} · starts {classDateLabel(c.starts_at)}
                  </div>
                  {c.venue && (
                    <div className="text-[12px] opacity-85">
                      {c.venue.name}, {c.venue.suburb}
                    </div>
                  )}
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold">
                      A${(c.course_total_aud_cents ?? 0) / 100}
                    </span>
                    <Link
                      to={`/portal/checkout/class/${c.id}`}
                      className="rounded-full bg-canvas-pure/90 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.10em] text-ink"
                    >
                      Pay now &amp; lock a seat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
