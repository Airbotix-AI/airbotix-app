// Pay-now class seat checkout (class-seat-checkout-prd.md D-CSC-8).
// Deep-link target `/portal/checkout/class/:classId` for the marketing site and
// Portal Courses. Shows the class summary, lets the parent pick (or create) a
// kid, then hands off to the Airwallex hosted page. On return it polls the
// order status until the webhook has locked the seat.

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';

interface CheckoutVenue {
  name: string;
  address_line: string;
  suburb: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
}

interface CheckoutClass {
  id: string;
  name: string;
  delivery_mode: string;
  starts_at: string;
  ends_at: string;
  max_students: number;
  enrolled: number;
  seats_remaining: number;
  venue: CheckoutVenue | null;
  fixed_price_aud_cents: number | null;
  price_aud_cents: number | null;
  course_total_aud_cents: number | null;
  session_count: number | null;
  session_minutes: number | null;
  purchasable: boolean;
  course_pack: { id: string; slug: string; title: string } | null;
}

interface Kid {
  id: string;
  nickname: string;
  age: number;
}

interface CheckoutResponse {
  booking_id: string;
  payment_intent_id: string;
  checkout_url: string;
}

interface OrderStatus {
  status: string;
  needs_refund: boolean;
  enrolled: boolean;
}

// Pending-intent handoff key: written just before the Airwallex redirect so the
// return trip knows which order to poll. Not a credential — safe in storage.
const intentKey = (classId: string) => `class_seat:${classId}`;
const kidNameKey = (classId: string) => `class_seat:${classId}:kid`;

const POLL_INTERVAL_MS = 3_000;
const POLL_MAX_ATTEMPTS = 40; // ~2 minutes

const aud = (cents: number) => `A$${cents / 100}`;
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// kid_id XOR new-kid fields (nickname + age) — mirrors the backend DTO.
const schema = z
  .object({
    kid_id: z.string(),
    kid_nickname: z.string().max(40).optional(),
    kid_age: z.string().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.kid_id) return;
    if (!v.kid_nickname?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['kid_nickname'], message: 'Add a nickname' });
    }
    const age = Number(v.kid_age);
    if (!v.kid_age?.trim() || !Number.isInteger(age) || age < 4 || age > 17) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['kid_age'], message: 'Age must be 4–17' });
    }
  });

type FormValues = z.infer<typeof schema>;

// What the return-from-Airwallex poll concluded (idle = no pending intent).
type Phase = 'idle' | 'confirming' | 'locked' | 'failed' | 'full' | 'timeout';

export function ClassCheckoutPage() {
  const { classId } = useParams<{ classId: string }>();
  const location = useLocation();
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const [phase, setPhase] = useState<Phase>('idle');
  const [pollNonce, setPollNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const cls = useQuery<CheckoutClass>({
    queryKey: ['class-seats', 'class', classId],
    queryFn: () => api<CheckoutClass>(`/class-seats/classes/${classId}`),
    enabled: !!classId,
    retry: false,
  });

  const kids = useQuery<Kid[]>({
    queryKey: ['families', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: !!familyId,
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { kid_id: '' } });
  const selectedKidId = watch('kid_id');

  // Returned from the hosted page? Poll the order until the webhook lands.
  useEffect(() => {
    if (!classId) return;
    const intentId = sessionStorage.getItem(intentKey(classId));
    if (!intentId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    setPhase('confirming');

    const clearIntent = () => {
      sessionStorage.removeItem(intentKey(classId));
    };

    const tick = async () => {
      attempts += 1;
      try {
        const order = await api<OrderStatus>(`/class-seats/orders/${intentId}`);
        if (cancelled) return;
        if (order.status === 'succeeded' && order.enrolled) {
          clearIntent();
          setPhase('locked');
          return;
        }
        if (order.status === 'succeeded' && order.needs_refund) {
          clearIntent();
          setPhase('full');
          return;
        }
        if (order.status === 'failed') {
          clearIntent();
          setPhase('failed');
          return;
        }
      } catch {
        // transient — keep polling until the attempt budget runs out
      }
      if (cancelled) return;
      if (attempts >= POLL_MAX_ATTEMPTS) {
        setPhase('timeout');
        return;
      }
      timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [classId, pollNonce]);

  // Paying requires a family (D-CSC-3) — send them through setup, then back here.
  if (me.data?.kind === 'user' && !me.data.family_id) {
    return <Navigate to="/portal/register" state={{ from: location }} replace />;
  }

  if (!classId || cls.isError) {
    const notFound = cls.error instanceof ApiError && cls.error.status === 404;
    return (
      <div>
        <Header />
        <div className="card-base mt-6">
          <span className="sticker-sunshine">Not available</span>
          <p className="lead-text mt-4">
            {notFound
              ? "This class isn't open for online purchase."
              : 'We could not load this class right now.'}
          </p>
          <Link to="/portal/courses" className="btn-pill-secondary mt-6 inline-block">
            Browse courses →
          </Link>
        </div>
      </div>
    );
  }

  if (cls.isLoading || !cls.data) {
    return (
      <div>
        <Header />
        <p className="lead-text mt-6">Loading class…</p>
      </div>
    );
  }

  const c = cls.data;
  const kidName = sessionStorage.getItem(kidNameKey(classId));

  if (phase === 'locked') {
    return (
      <div>
        <Header />
        <div className="card-base mt-6">
          <span className="sticker-mint">Seat locked</span>
          <h2 className="section-heading mt-4">
            Seat locked{kidName ? ` for ${kidName}` : ''} ✓
          </h2>
          <p className="lead-text mt-3">
            Payment received — {kidName ?? 'your kid'} is enrolled in {c.name}. A receipt is on
            its way to your inbox.
          </p>
          <Link to="/portal/courses" className="btn-pill-primary mt-6 inline-block">
            Back to courses →
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'confirming') {
    return (
      <div>
        <Header />
        <ClassSummaryCard c={c} />
        <div className="card-base mt-6 text-center">
          <span className="sticker-sky alt">Confirming payment…</span>
          <p className="lead-text mt-4">
            Hang tight — we're waiting for your payment confirmation. This usually takes a few
            seconds.
          </p>
        </div>
      </div>
    );
  }

  // Poll budget exhausted with the intent still pending. The payment may STILL
  // succeed server-side, so this screen must never re-offer the Pay button — a
  // second intent here risks a double charge. Only 'failed' (intent terminally
  // failed/cancelled, stored key already cleared) re-offers Pay below.
  if (phase === 'timeout') {
    return (
      <div>
        <Header />
        <ClassSummaryCard c={c} />
        <div className="card-base mt-6">
          <span className="sticker-sunshine">Still confirming</span>
          <p className="lead-text mt-4">
            We haven't received your payment confirmation yet. If you completed payment,
            don't pay again — the seat locks automatically the moment confirmation arrives.
          </p>
          <button
            type="button"
            onClick={() => setPollNonce((n) => n + 1)}
            className="btn-pill-primary mt-6"
          >
            Check again →
          </button>
          <p className="mt-4 text-[12px] leading-relaxed text-slate2">
            Still nothing after a few minutes? Check your courses in the Portal later or
            contact our team — if the payment didn't go through, you won't be charged.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'full') {
    return (
      <div>
        <Header />
        <div className="card-base mt-6">
          <span className="sticker-coral">Class filled up</span>
          <p className="lead-text mt-4">
            Your payment went through, but the last seat in {c.name} was taken while you were
            paying. Our team will refund you in full — no action needed.
          </p>
          <Link to="/portal/courses" className="btn-pill-secondary mt-6 inline-block">
            Browse other classes →
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const body = values.kid_id
        ? { class_id: classId, kid_id: values.kid_id }
        : {
            class_id: classId,
            kid_nickname: values.kid_nickname?.trim(),
            kid_age: Number(values.kid_age),
          };
      const res = await api<CheckoutResponse>('/class-seats/checkout', { method: 'POST', body });
      const nickname = values.kid_id
        ? (kids.data ?? []).find((k) => k.id === values.kid_id)?.nickname
        : values.kid_nickname?.trim();
      sessionStorage.setItem(intentKey(classId), res.payment_intent_id);
      if (nickname) sessionStorage.setItem(kidNameKey(classId), nickname);
      window.location.href = res.checkout_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not start checkout.');
    }
  };

  return (
    <div>
      <Header />
      <ClassSummaryCard c={c} />

      {!c.purchasable ? (
        <div className="card-base mt-6">
          <span className="sticker-sunshine">Reserve only</span>
          <p className="lead-text mt-4">
            This class can't be purchased online right now — it may be full or not yet priced.
            You can still request a seat and our team will be in touch.
          </p>
          <Link to="/portal/courses" className="btn-pill-secondary mt-6 inline-block">
            Request a seat from Courses →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="card-base mt-6 space-y-5">
          <div className="eyebrow eyebrow-bubblegum">Who's this seat for?</div>

          <label className="block">
            <span className="label-k12">Kid</span>
            <select className="input-k12" {...register('kid_id')}>
              <option value="">New kid — add below</option>
              {(kids.data ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nickname} (age {k.age})
                </option>
              ))}
            </select>
          </label>

          {!selectedKidId && (
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="label-k12">Nickname</span>
                <input className="input-k12" placeholder="Mia" {...register('kid_nickname')} />
                {errors.kid_nickname && (
                  <span className="field-error">{errors.kid_nickname.message}</span>
                )}
              </label>
              <label className="block">
                <span className="label-k12">Age</span>
                <input
                  type="number"
                  min={4}
                  max={17}
                  className="input-k12"
                  {...register('kid_age')}
                />
                {errors.kid_age && <span className="field-error">{errors.kid_age.message}</span>}
              </label>
            </div>
          )}

          {phase === 'failed' && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              That payment didn't go through — nothing was charged. Try again below.
            </div>
          )}
          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-pill-primary w-full">
            {isSubmitting
              ? 'Starting checkout…'
              : `Pay ${c.course_total_aud_cents != null ? aud(c.course_total_aud_cents) : ''} & lock the seat`}
          </button>
          <p className="text-[12px] leading-relaxed text-slate2">
            You'll pay securely on our payment page (Airwallex). The seat is locked the moment
            payment succeeds.
          </p>
        </form>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <div className="eyebrow eyebrow-mint">Checkout</div>
      <h1 className="section-heading">Lock a seat</h1>
    </div>
  );
}

function ClassSummaryCard({ c }: { c: CheckoutClass }) {
  return (
    <div className="card-base mt-6">
      {c.course_pack && (
        <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate2">
          {c.course_pack.title}
        </div>
      )}
      <h2 className="mt-1 text-[22px] font-bold leading-tight">{c.name}</h2>
      <div className="mt-3 space-y-1 text-[14px]">
        <div>Starts {dateLabel(c.starts_at)}</div>
        {c.venue && (
          <div className="text-slate2">
            {c.venue.name} · {c.venue.address_line}, {c.venue.suburb} {c.venue.state}{' '}
            {c.venue.postcode}
          </div>
        )}
        {c.session_count != null && c.session_minutes != null && (
          <div className="text-slate2">
            {c.session_count} sessions × {c.session_minutes} min
          </div>
        )}
      </div>
      {c.course_total_aud_cents != null && (
        <div className="mt-4 text-[24px] font-extrabold">
          {aud(c.course_total_aud_cents)}
          <span className="ml-2 text-[13px] font-semibold text-slate2">whole course</span>
        </div>
      )}
    </div>
  );
}
