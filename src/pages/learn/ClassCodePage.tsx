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
    <div className="flex min-h-full items-center justify-center bg-cream p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold text-charcoal">Join a class</h1>
          <p className="mt-1 text-sm text-slate-600">
            Your teacher gave you a code. Type it in below.
          </p>
        </div>

        <label className="block text-sm">
          <span className="text-charcoal">Class code</span>
          <input
            type="text"
            autoComplete="off"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-center font-mono text-lg uppercase tracking-widest focus:border-brand-500 focus:outline-none"
            placeholder="WANG-T1"
            {...register('class_code')}
          />
          {errors.class_code && (
            <span className="mt-1 block text-xs text-danger-600">{errors.class_code.message}</span>
          )}
        </label>

        <label className="block text-sm">
          <span className="text-charcoal">What do you want to be called? (optional)</span>
          <input
            type="text"
            autoComplete="off"
            className="mt-1 block w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
            placeholder="Mia"
            {...register('display_nickname')}
          />
        </label>

        {error && <div className="text-xs text-danger-600">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Joining…' : 'Join'}
        </button>

        <p className="text-center text-xs text-slate-500">
          Already have your own account?{' '}
          <Link to="/learn/login" className="text-brand-600 hover:underline">
            Sign in here →
          </Link>
        </p>
      </form>
    </div>
  );
}
