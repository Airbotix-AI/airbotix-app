import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { kidLogin } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  family_code: z.string().min(4).max(12),
  nickname: z.string().min(1).max(40),
  pin: z.string().length(4).regex(/^\d{4}$/, '4 digits'),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await kidLogin(values.family_code, values.nickname, values.pin);
      nav('/learn', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="mb-2">
          <span className="sticker-bubblegum">Hi there!</span>
        </div>
        <h1 className="hero-display mt-6">
          Let's <span className="squiggle-word">make</span> something.
        </h1>
        <p className="lead-text mt-4">
          Type your family code, your nickname, and your 4-digit PIN.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <Field label="Family code" error={errors.family_code?.message}>
            <input
              className="input-k12 font-mono uppercase text-[20px] tracking-[0.2em]"
              placeholder="WANG"
              autoComplete="off"
              autoCapitalize="characters"
              {...register('family_code')}
            />
          </Field>
          <Field label="My nickname" error={errors.nickname?.message}>
            <input
              className="input-k12"
              placeholder="Mia"
              autoComplete="off"
              {...register('nickname')}
            />
          </Field>
          <Field label="PIN (4 digits)" error={errors.pin?.message}>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className="input-k12 font-mono text-center tracking-[0.5em] text-[24px]"
              placeholder="••••"
              autoComplete="off"
              {...register('pin')}
            />
          </Field>

          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-pill-primary w-full">
            {isSubmitting ? 'Signing in…' : 'Let me in →'}
          </button>
        </form>

        <div className="mt-8 space-y-2 text-center text-[13px] text-slate2">
          <div>
            Workshop today?{' '}
            <Link to="/learn/class-code" className="font-semibold text-brand-bubblegum hover:underline">
              Use a class code →
            </Link>
          </div>
          <div>
            Parent?{' '}
            <Link to="/portal/login" className="font-semibold text-brand-coral hover:underline">
              Sign in here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label-k12">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
