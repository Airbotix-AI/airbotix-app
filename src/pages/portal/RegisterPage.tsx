import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';

// Family setup. Backend auto-generates the family code (kid-memorable 4 chars).
// Multi-step "90s wizard" comes once underlying endpoints settle.
const schema = z.object({
  family_name: z.string().min(1).max(80),
  region: z.string().min(2).max(8),
  kid_nickname: z.string().min(1).max(40),
  kid_age: z.coerce.number().int().min(4).max(17),
  kid_pin: z.string().length(4).regex(/^\d{4}$/, '4 digits'),
});

type FormValues = z.infer<typeof schema>;

interface CreatedFamily {
  id: string;
  code: string;
  name: string;
}

export function RegisterPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const me = useMe();
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedFamily | null>(null);

  // If user already has a family, skip — they shouldn't be on this page.
  useEffect(() => {
    if (me.data?.kind === 'user' && me.data.family_id) {
      nav('/portal', { replace: true });
    }
  }, [me.data, nav]);

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
      const family = await api<CreatedFamily>('/families', {
        method: 'POST',
        body: { name: values.family_name, region: values.region },
      });
      await api<unknown>(`/families/${family.id}/kids`, {
        method: 'POST',
        body: {
          nickname: values.kid_nickname,
          age: values.kid_age,
          pin: values.kid_pin,
        },
      });
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      setCreated(family);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        setError('You already have a family. Going to your dashboard…');
        setTimeout(() => nav('/portal', { replace: true }), 1500);
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Registration failed.');
    }
  };

  if (created) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="mb-2">
            <span className="sticker-mint">All set!</span>
          </div>
          <h1 className="hero-display mt-6">
            Welcome to <span className="squiggle-word">Airbotix</span>.
          </h1>
          <p className="lead-text mt-4">
            Your family is ready. Save this family code — your kid types it to sign in.
          </p>

          <div className="mt-8 rounded-hero bg-grad-mint p-8 text-white shadow-brand-mint">
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">
              Family code
            </div>
            <div className="mt-3 font-mono font-extrabold tracking-[0.3em]" style={{ fontSize: '56px', letterSpacing: '0.2em' }}>
              {created.code}
            </div>
            <div className="mt-2 text-[14px] opacity-90">{created.name}</div>
          </div>

          <button
            onClick={() => nav('/portal', { replace: true })}
            className="btn-pill-primary w-full mt-8"
          >
            Go to dashboard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: '560px' }}>
        <div className="mb-2">
          <span className="sticker-mint">Welcome</span>
        </div>
        <h1 className="hero-display mt-6">
          Set up your <span className="squiggle-word">family</span>.
        </h1>
        <p className="lead-text mt-4">
          Takes about 90 seconds. You'll get a family code once you're done.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-6">
          <section className="space-y-4">
            <div className="eyebrow eyebrow-sky">Your family</div>
            <Field label="Family name" error={errors.family_name?.message}>
              <input
                className="input-k12"
                placeholder="The Wang Family"
                autoComplete="off"
                {...register('family_name')}
              />
            </Field>
            <Field label="Region" error={errors.region?.message}>
              <input className="input-k12" {...register('region')} />
            </Field>
          </section>

          <section className="space-y-4">
            <div className="eyebrow eyebrow-bubblegum">Your first kid</div>
            <Field label="Nickname" error={errors.kid_nickname?.message}>
              <input className="input-k12" placeholder="Mia" {...register('kid_nickname')} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Age" error={errors.kid_age?.message}>
                <input
                  type="number"
                  min={4}
                  max={17}
                  className="input-k12"
                  {...register('kid_age')}
                />
              </Field>
              <Field label="4-digit PIN" error={errors.kid_pin?.message}>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  className="input-k12 font-mono tracking-[0.4em] text-center"
                  placeholder="••••"
                  {...register('kid_pin')}
                />
              </Field>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
              {error}
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-pill-primary w-full">
            {isSubmitting ? 'Creating…' : 'Create family →'}
          </button>

          <p className="text-[12px] leading-relaxed text-slate2">
            By continuing you agree to Airbotix processing your family's data per our Privacy
            Policy and Parental Consent terms. You can export or delete all data anytime from
            Settings.
          </p>
        </form>
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
