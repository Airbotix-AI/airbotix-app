import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';

import { verifyOtp } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  code: z.string().length(6, '6 digits').regex(/^\d{6}$/, '6 digits'),
});
type FormValues = z.infer<typeof schema>;

interface LocationState {
  email?: string;
  // Original URL the parent was trying to reach when ProtectedRoute bounced
  // them through login. Carried forward by LoginPage so we can land them
  // there post-verify (preserves query params like ?from=cli).
  from?: Location;
}

export function VerifyOtpPage() {
  const location = useLocation();
  const nav = useNavigate();
  const state = location.state as LocationState | undefined;
  const email = state?.email;
  const from = state?.from;
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!email) return <Navigate to="/portal/login" replace />;

  const onSubmit = async ({ code }: FormValues) => {
    setError(null);
    try {
      const res = await verifyOtp(email, code);
      // New users always go through register first — they can't land on
      // wallet without a family anyway. The return URL threads through as
      // state so register can land them back (e.g. a marketing pay-now
      // deep-link, class-seat-checkout-prd.md D-CSC-8). Returning users go
      // to wherever ProtectedRoute caught them (preserving query string),
      // defaulting to /portal if no return URL was stashed.
      if (res.user.is_new_user) {
        nav('/portal/register', { replace: true, state: from ? { from } : undefined });
        return;
      }
      const dest = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/portal';
      nav(dest, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verification failed.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="mb-2">
          <span className="sticker-sky alt">Check your inbox</span>
        </div>
        <h1 className="hero-display mt-6">Enter your code</h1>
        <p className="lead-text mt-4">
          We sent a 6-digit code to{' '}
          <span className="font-semibold text-ink">{email}</span>.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label htmlFor="code" className="label-k12">6-digit code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              autoFocus
              placeholder="••••••"
              className="input-k12-otp"
              {...register('code')}
            />
            {errors.code && <span className="field-error">{errors.code.message}</span>}
          </div>

          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-pill-primary w-full">
            {isSubmitting ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-slate2">
          Didn't get the code?{' '}
          <button
            type="button"
            onClick={() => nav('/portal/login', { state: from ? { from } : undefined })}
            className="font-semibold text-brand-coral hover:underline"
          >
            Try again →
          </button>
        </p>
      </div>
    </div>
  );
}
