import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { requestOtp } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';

const schema = z.object({ email: z.string().email() });
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const nav = useNavigate();
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
      nav('/portal/verify-otp', { state: { email } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send code. Try again.');
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Parent Portal</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in with your email.</p>
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Email</span>
          <input
            type="email"
            autoComplete="email"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            {...register('email')}
          />
          {errors.email && (
            <span className="mt-1 block text-xs text-danger-600">{errors.email.message}</span>
          )}
        </label>
        {error && <div className="text-xs text-danger-600">{error}</div>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Sending…' : 'Send code'}
        </button>
        <p className="text-center text-xs text-slate-500">
          Kid?{' '}
          <a href="/learn/login" className="text-brand-600 hover:underline">
            Sign in here →
          </a>
        </p>
      </form>
    </div>
  );
}
