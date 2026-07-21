import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';

import { loginWithPassword, requestOtp } from '@/auth/useAuth';
import { AuthIdentityLayout } from '@/components/auth/AuthIdentityLayout';
import { WeChatBrowserNotice } from '@/components/auth/WeChatBrowserNotice';
import { ApiError } from '@/lib/api';

// Two login modes on one screen (auth-system-prd §4.8): the passwordless OTP
// flow (default, always works) and an optional email+password login for parents
// who set a password from /portal/settings. Password is faster for daily use;
// OTP stays as the fallback / recovery path, so "forgot password" is just
// "email me a code instead" — there is no separate reset flow.
const otpSchema = z.object({ email: z.string().email() });
type OtpValues = z.infer<typeof otpSchema>;

const passwordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
});
type PasswordValues = z.infer<typeof passwordSchema>;

interface LoginLocationState {
  // Where the parent was trying to go before ProtectedRoute bounced them
  // here. Forwarded through OTP verify (and used directly on password login)
  // so we can land them on the original URL (preserving query params).
  from?: Location;
}

export function LoginPage() {
  const nav = useNavigate();
  const location = useLocation();
  const from = (location.state as LoginLocationState | null)?.from;
  // Password is the DEFAULT login experience — parents log in with email +
  // password and never see a code prompt. OTP is demoted to a discreet fallback
  // link for first-time setup / forgotten password (it stays the recovery path,
  // §4.8, but is out of the way).
  const [mode, setMode] = useState<'otp' | 'password'>('password');
  const [error, setError] = useState<string | null>(null);

  const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema) });
  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onOtpSubmit = async ({ email }: OtpValues) => {
    setError(null);
    try {
      await requestOtp(email);
      nav('/portal/verify-otp', { state: { email, from } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send code. Try again.');
    }
  };

  const onPasswordSubmit = async ({ email, password }: PasswordValues) => {
    setError(null);
    try {
      const res = await loginWithPassword(email, password);
      // Existing parents with a password are never brand-new; still honour the
      // register redirect defensively if the backend ever flags is_new_user.
      if (res.user.is_new_user) {
        nav('/portal/register', { replace: true, state: from ? { from } : undefined });
        return;
      }
      const dest = from ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}` : '/portal';
      nav(dest, { replace: true });
    } catch (e) {
      // Generic backend error (INVALID_CREDENTIALS) — never reveals whether the
      // email exists or a password was set.
      setError(
        e instanceof ApiError
          ? 'Email or password is incorrect. You can sign in with a code instead.'
          : 'Login failed. Try again.',
      );
    }
  };

  const switchMode = (next: 'otp' | 'password') => {
    setError(null);
    setMode(next);
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
        {mode === 'otp'
          ? "Enter your email for your family account and we'll send a secure one-time code. No password needed."
          : 'Sign in with your email and password. Set one up in Settings after your first login.'}
      </p>

      <div className="mt-6">
        <WeChatBrowserNotice />
      </div>

      {mode === 'otp' ? (
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="mt-8 space-y-5">
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
              {...otpForm.register('email')}
            />
            {otpForm.formState.errors.email && (
              <span className="field-error">{otpForm.formState.errors.email.message}</span>
            )}
          </div>

          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={otpForm.formState.isSubmitting}
            className="btn-pill-primary w-full"
          >
            {otpForm.formState.isSubmitting ? 'Sending…' : 'Send code & continue'}
          </button>

          <button
            type="button"
            onClick={() => switchMode('password')}
            className="text-[13px] font-semibold text-brand-sky underline underline-offset-2"
          >
            Log in with a password instead
          </button>
        </form>
      ) : (
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="mt-8 space-y-5">
          <div>
            <label htmlFor="pw-email" className="label-k12">
              Email
            </label>
            <input
              id="pw-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="input-k12"
              {...passwordForm.register('email')}
            />
            {passwordForm.formState.errors.email && (
              <span className="field-error">{passwordForm.formState.errors.email.message}</span>
            )}
          </div>

          <div>
            <label htmlFor="pw-password" className="label-k12">
              Password
            </label>
            <input
              id="pw-password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              className="input-k12"
              {...passwordForm.register('password')}
            />
            {passwordForm.formState.errors.password && (
              <span className="field-error">{passwordForm.formState.errors.password.message}</span>
            )}
          </div>

          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="btn-pill-primary w-full"
          >
            {passwordForm.formState.isSubmitting ? 'Signing in…' : 'Log in'}
          </button>

          <button
            type="button"
            onClick={() => switchMode('otp')}
            className="text-[13px] font-semibold text-brand-sky underline underline-offset-2"
          >
            First time, or forgot your password? Get a code instead
          </button>
        </form>
      )}

      <div className="mt-6 rounded-2xl border border-brand-mint/30 bg-wash-mint px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
        <strong className="text-ink">New to Airbotix?</strong> Use the code option — after the code,
        we'll help you set up your family and your first kid profile.
      </div>
    </AuthIdentityLayout>
  );
}
