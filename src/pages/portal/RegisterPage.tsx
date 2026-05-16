import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { api, ApiError } from '@/lib/api';

// First-time parent setup wizard (parent-portal-prd.md §3.1).
// V0: collapsed into a single form (display_name + family_name + region +
// first kid). Multi-step "90 seconds" wizard layout per PRD can be filled in
// once the underlying endpoints are real on the backend.

const schema = z.object({
  display_name: z.string().min(1).max(80),
  family_name: z.string().min(1).max(80),
  region: z.string().min(2).max(8),
  kid_nickname: z.string().min(1).max(40),
  kid_age: z.coerce.number().int().min(4).max(17),
  kid_pin: z
    .string()
    .length(4)
    .regex(/^\d{4}$/, '4 digits'),
  family_code: z
    .string()
    .min(4)
    .max(12)
    .regex(/^[A-Z0-9-]+$/, 'A-Z, 0-9, dash only'),
});

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { region: 'AU' },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      // TODO(platform-backend §5.2 / §5.3): replace with the eventual atomic
      // POST /families bootstrap. For now we hit two endpoints in sequence.
      const family = await api<{ id: string }>('/families', {
        method: 'POST',
        body: {
          name: values.family_name,
          region: values.region,
          code: values.family_code.toUpperCase(),
          primary_display_name: values.display_name,
        },
      });
      await api<unknown>(`/families/${family.id}/kids`, {
        method: 'POST',
        body: {
          nickname: values.kid_nickname,
          age: values.kid_age,
          pin: values.kid_pin,
        },
      });
      nav('/portal', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Registration failed.');
    }
  };

  return (
    <div className="flex min-h-full items-start justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-lg space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Welcome to Airbotix</h1>
          <p className="mt-1 text-sm text-slate-600">
            Let's set up your family. You can edit anything later from Settings.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">You</h2>
          <Field label="Your name" error={errors.display_name?.message}>
            <input
              className="input"
              placeholder="Lightman"
              autoComplete="name"
              {...register('display_name')}
            />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your family
          </h2>
          <Field label="Family name" error={errors.family_name?.message}>
            <input
              className="input"
              placeholder="The Wang Family"
              {...register('family_name')}
            />
          </Field>
          <Field label="Region" error={errors.region?.message}>
            <input className="input" {...register('region')} />
          </Field>
          <Field
            label="Family code (kids type this to sign in)"
            error={errors.family_code?.message}
          >
            <input
              className="input font-mono uppercase"
              placeholder="WANG"
              {...register('family_code')}
            />
          </Field>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your first kid
          </h2>
          <Field label="Nickname" error={errors.kid_nickname?.message}>
            <input className="input" placeholder="Mia" {...register('kid_nickname')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Age" error={errors.kid_age?.message}>
              <input type="number" min={4} max={17} className="input" {...register('kid_age')} />
            </Field>
            <Field label="4-digit PIN" error={errors.kid_pin?.message}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="input font-mono tracking-widest"
                placeholder="1234"
                {...register('kid_pin')}
              />
            </Field>
          </div>
        </section>

        {error && <div className="text-xs text-danger-600">{error}</div>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Creating…' : 'Create family'}
        </button>

        <p className="text-xs text-slate-500">
          By continuing you agree to Airbotix processing your family's data per our Privacy Policy
          and Parental Consent terms. You can export or delete all data anytime from Settings.
        </p>
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
      <span className="text-slate-700">{label}</span>
      <div className="mt-1">{children}</div>
      {error && <span className="mt-1 block text-xs text-danger-600">{error}</span>}
    </label>
  );
}
