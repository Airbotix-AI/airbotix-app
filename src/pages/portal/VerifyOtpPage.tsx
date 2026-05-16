import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { verifyOtp } from '@/auth/useAuth';
import { ApiError } from '@/lib/api';

const schema = z.object({
  code: z
    .string()
    .length(6, '6 digits')
    .regex(/^\d{6}$/, '6 digits'),
});
type FormValues = z.infer<typeof schema>;

interface LocationState {
  email?: string;
}

export function VerifyOtpPage() {
  const location = useLocation();
  const nav = useNavigate();
  const email = (location.state as LocationState | undefined)?.email;
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
      nav(res.user.is_new_user ? '/portal/register' : '/portal', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Verification failed.');
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Check your email</h1>
          <p className="mt-1 text-sm text-slate-600">
            We sent a 6-digit code to <span className="font-mono">{email}</span>.
          </p>
        </div>
        <label className="block text-sm">
          <span className="text-slate-700">Code</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-center font-mono text-lg tracking-widest focus:border-brand-500 focus:outline-none"
            {...register('code')}
          />
          {errors.code && (
            <span className="mt-1 block text-xs text-danger-600">{errors.code.message}</span>
          )}
        </label>
        {error && <div className="text-xs text-danger-600">{error}</div>}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Verifying…' : 'Verify'}
        </button>
      </form>
    </div>
  );
}
