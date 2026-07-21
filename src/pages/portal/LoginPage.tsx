import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';

import { requestOtp } from '@/auth/useAuth';
import { AuthIdentityLayout } from '@/components/auth/AuthIdentityLayout';
import { WeChatBrowserNotice } from '@/components/auth/WeChatBrowserNotice';
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
    <AuthIdentityLayout activeRole="parent">
      <div>
        <span className="sticker-sky">Parents &amp; guardians</span>
      </div>
      <h1 className="hero-display mt-6">
        <span className="squiggle-word">Parent</span> login or sign up.
      </h1>
      <p className="lead-text mt-4">
        Enter your email for your family account and we'll send a secure one-time code. No password
        needed.
      </p>

      <div className="mt-6">
        <WeChatBrowserNotice />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="label-k12">
            Email
          </label>
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
          {isSubmitting ? 'Sending…' : 'Send code & continue'}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-brand-mint/30 bg-wash-mint px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
        <strong className="text-ink">New to Airbotix?</strong> After the code, we'll help you set up
        your family and your first kid profile.
      </div>
    </AuthIdentityLayout>
  );
}
