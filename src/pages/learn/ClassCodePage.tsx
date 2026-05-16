import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { classCodeLogin } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  class_code: z.string().min(4).max(12),
  display_nickname: z.string().min(1).max(40).optional(),
});
type FormValues = z.infer<typeof schema>;

export function ClassCodePage() {
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
      await classCodeLogin(values.class_code.toUpperCase(), values.display_nickname);
      nav('/learn', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not join class.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="mb-2">
          <span className="sticker-sunshine alt">Workshop</span>
        </div>
        <h1 className="hero-display mt-6">Join your class.</h1>
        <p className="lead-text mt-4">
          Your teacher gave you a code. Type it below — no account needed for today.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <label className="block">
            <span className="label-k12">Class code</span>
            <input
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={12}
              className="input-k12 font-mono text-center tracking-[0.3em] text-[28px] uppercase"
              placeholder="ABC-D1"
              {...register('class_code')}
            />
            {errors.class_code && (
              <span className="field-error">{errors.class_code.message}</span>
            )}
          </label>

          <label className="block">
            <span className="label-k12">What do you want to be called? (optional)</span>
            <input
              type="text"
              autoComplete="off"
              className="input-k12"
              placeholder="Mia"
              {...register('display_nickname')}
            />
          </label>

          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-pill-primary w-full">
            {isSubmitting ? 'Joining…' : 'Join →'}
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-slate2">
          Got a family code instead?{' '}
          <Link to="/learn/login" className="font-semibold text-brand-bubblegum hover:underline">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
