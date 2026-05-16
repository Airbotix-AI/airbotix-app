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
  pin: z
    .string()
    .length(4)
    .regex(/^\d{4}$/, '4 digits'),
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
    <div className="flex min-h-full items-center justify-center bg-cream p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Airbotix Learn</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in to start making things.</p>
        </div>

        <Field label="Family code" error={errors.family_code?.message}>
          <input
            className="input font-mono uppercase"
            placeholder="WANG"
            autoComplete="off"
            {...register('family_code')}
          />
        </Field>
        <Field label="My nickname" error={errors.nickname?.message}>
          <input className="input" placeholder="Mia" autoComplete="off" {...register('nickname')} />
        </Field>
        <Field label="PIN (4 digits)" error={errors.pin?.message}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            className="input text-center font-mono tracking-widest"
            placeholder="••••"
            autoComplete="off"
            {...register('pin')}
          />
        </Field>

        {error && <div className="text-xs text-danger-600">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="space-y-1 text-center text-xs text-slate-500">
          <div>
            Workshop today?{' '}
            <Link to="/learn/class-code" className="text-brand-600 hover:underline">
              Use a class code →
            </Link>
          </div>
          <div>
            Parent?{' '}
            <Link to="/portal/login" className="text-brand-600 hover:underline">
              Sign in here →
            </Link>
          </div>
        </div>
      </form>

      <style>{`.input{display:block;width:100%;border:1px solid #cbd5e1;border-radius:0.25rem;padding:0.5rem 0.75rem;font-size:0.875rem}.input:focus{outline:none;border-color:#0ea5e9}`}</style>
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
    <label className="block text-sm">
      <span className="text-charcoal">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-xs text-danger-600">{error}</span>}
    </label>
  );
}
