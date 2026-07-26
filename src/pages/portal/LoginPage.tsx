import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate, type Location } from 'react-router-dom';
import { z } from 'zod';

import { loginWithPassword, requestOtp } from '@/auth/useAuth';
import { AuthIdentityLayout } from '@/components/auth/AuthIdentityLayout';
import { WeChatBrowserNotice } from '@/components/auth/WeChatBrowserNotice';
import { ApiError } from '@/lib/api';

// The parent chooses their sign-in method (auth-system-prd §4.8): an email+password
// login or a passwordless one-time email code. Both are first-class, side-by-side
// tabs — neither is hidden. A parent opts a password in from /portal/settings; the
// code path is always available and doubles as the recovery path (a forgotten
// password just means "use a code"), so there is no separate password-reset flow.
type Mode = 'password' | 'otp';

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
  const [mode, setMode] = useState<Mode>('password');
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

  const switchMode = (next: Mode) => {
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
        {mode === 'password'
          ? 'Sign in with your email and password. Set one up in Settings after your first login.'
          : "Enter your email and we'll send a secure one-time code. No password needed."}
      </p>

      <div className="mt-6">
        <WeChatBrowserNotice />
      </div>

      {/* Method chooser — password vs email code, both first-class (§4.8). */}
      <div
        role="tablist"
        aria-label="Choose how to sign in"
        className="mt-8 grid grid-cols-2 gap-1 rounded-full bg-wash-sky p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'password'}
          onClick={() => switchMode('password')}
          className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
            mode === 'password' ? 'bg-canvas-pure text-ink shadow-card-soft' : 'text-ink-soft'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'otp'}
          onClick={() => switchMode('otp')}
          className={`rounded-full px-4 py-2 text-[14px] font-semibold transition-colors ${
            mode === 'otp' ? 'bg-canvas-pure text-ink shadow-card-soft' : 'text-ink-soft'
          }`}
        >
          Email code
        </button>
      </div>

      {mode === 'password' ? (
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="mt-6 space-y-5">
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

          <p className="text-[13px] font-medium text-ink-soft">
            First time, or forgot your password?{' '}
            <button
              type="button"
              onClick={() => switchMode('otp')}
              className="font-semibold text-brand-sky underline underline-offset-2"
            >
              Get a code instead
            </button>
          </p>
        </form>
      ) : (
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="mt-6 space-y-5">
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
        </form>
      )}

      <div className="mt-6 rounded-2xl border border-brand-mint/30 bg-wash-mint px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
        <strong className="text-ink">New to Airbotix?</strong> Choose <em>Email code</em> — after
        the code, we'll help you set up your family and your first kid profile.
      </div>
    </AuthIdentityLayout>
  );
}
