import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';

import { verifyTeacherOtp } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  code: z.string().length(6, '6 digits').regex(/^\d{6}$/, '6 digits'),
});
type FormValues = z.infer<typeof schema>;

interface LocationState {
  email?: string;
  from?: Location;
}

// OTP verify for the in-app teacher class surface. There is no signup here —
// staff accounts are invite/application-only, so an unknown email gets 403
// NOT_INVITED and a pointer at the teacher console's application flow.
export function TeacherVerifyOtpPage() {
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

  if (!email) return <Navigate to="/teacher/login" replace />;

  const onSubmit = async ({ code }: FormValues) => {
    setError(null);
    try {
      await verifyTeacherOtp(email, code);
      const dest = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/teacher';
      nav(dest, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NOT_INVITED') {
        setError(
          "This email isn't a teacher account. Teachers are invited or apply via the teacher console — a parent account under the same email doesn't sign in here.",
        );
        return;
      }
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
            onClick={() => nav('/teacher/login')}
            className="font-semibold text-brand-coral hover:underline"
          >
            Try again →
          </button>
        </p>
      </div>
    </div>
  );
}
