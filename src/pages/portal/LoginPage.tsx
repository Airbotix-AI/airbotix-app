import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';

import { requestOtp } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

interface LoginLocationState {
  // Where the parent was trying to go before ProtectedRoute bounced them
  // here. Forwarded through OTP verify so we can land them on the original
  // URL (preserving query params like ?from=cli&device=…).
  from?: Location;
}

export function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from;
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    setError(null);
    try {
      await requestOtp(email);
      nav('/portal/verify-otp', { state: { email, from } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send code. Try again.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="mb-2">
          <span className="sticker-coral">Parent Portal</span>
        </div>
        <h1 className="hero-display mt-6">
          Welcome <span className="squiggle-word">back</span>.
        </h1>
        <p className="lead-text mt-4">
          Sign in with your email — we'll send you a one-time code.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label htmlFor="email" className="label-k12">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="input-k12"
              {...register('email')}
            />
            {errors.email && <span className="field-error">{errors.email.message}</span>}
          </div>

          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-pill-primary w-full">
            {isSubmitting ? 'Sending…' : 'Send code'}
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-slate2">
          Kid?{' '}
          <a href="/learn/login" className="font-semibold text-brand-coral hover:underline">
            Sign in here →
          </a>
        </p>
      </div>
    </div>
  );
}
