import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Navigate, useLocation, useNavigate, type Location } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useAuthStore } from '@/auth/authStore';
import { useLogout, useMe } from '@/auth/useAuth';
import { api, ApiError, refreshAccessToken } from '@/lib/api';
import { CityField } from './CityField';

import {
  ACQUISITION_SOURCES,
  ACQUISITION_SOURCE_LABELS,
  AU_STATES,
  detectPreferredLanguage,
  PREFERRED_LANGUAGES,
  PREFERRED_LANGUAGE_LABELS,
} from './familyProfile';

// Family setup. Backend auto-generates the family code (kid-memorable 4 chars).
// Multi-step "90s wizard" comes once underlying endpoints settle.
const schema = z.object({
  // The parent's own name (§3.1 wizard step "[1] Your name"). Written to
  // User.display_name via PATCH /auth/me before the family is created.
  your_name: z.string().min(1).max(120),
  family_name: z.string().min(1).max(80),
  region: z.string().min(2).max(8),
  city: z.string().max(80).optional(),
  // Optional analytics-relevant family profile (kept light at signup).
  state: z.enum(AU_STATES).or(z.literal('')).optional(),
  postcode: z.string().max(8).optional(),
  acquisition_source: z.enum(ACQUISITION_SOURCES).or(z.literal('')).optional(),
  preferred_language: z.enum(PREFERRED_LANGUAGES),
  marketing_opt_in: z.boolean().optional(),
  kid_nickname: z.string().min(1).max(40),
  kid_age: z.coerce.number().int().min(4).max(17),
  kid_pin: z.string().length(4).regex(/^\d{4}$/, '4 digits'),
  // Registration consent (terms-of-service.md §2.1): must be affirmatively
  // ticked; the backend rejects POST /families without accept_terms: true.
  accept_terms: z.literal(true, {
    errorMap: () => ({ message: 'You need to agree before we can set up your family.' }),
  }),
});

type FormValues = z.infer<typeof schema>;

interface CreatedFamily {
  id: string;
  code: string;
  name: string;
}

export function RegisterPage() {
  const nav = useNavigate();
  const location = useLocation();
  const qc = useQueryClient();
  const me = useMe();
  const logout = useLogout();
  const accessToken = useAuthStore((s) => s.tokens.user);
  const bootstrapped = useAuthStore((s) => s.bootstrapped);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedFamily | null>(null);

  // Deep-link return-to (class-seat-checkout-prd.md D-CSC-8): a page that
  // bounced the parent here (e.g. /portal/checkout/class/:id) stashes itself
  // as `from` — after the family exists we land them back there instead of
  // the dashboard. Default behaviour is unchanged when no `from` is present.
  const from = (location.state as { from?: Location } | undefined)?.from;
  const afterCreateDest = from
    ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
    : '/portal';

  // If user ARRIVES with a family, skip — they shouldn't be on this page.
  // Gated on !created: onSubmit's `me` invalidation flips family_id to
  // non-null mid-creation, and this effect must not hard-redirect over the
  // success screen (which shows the family code and honours `from`).
  useEffect(() => {
    if (created) return;
    if (me.data?.kind === 'user' && me.data.family_id) {
      nav(afterCreateDest, { replace: true });
    }
  }, [created, me.data, nav, afterCreateDest]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { region: 'AU', preferred_language: detectPreferredLanguage() },
  });

  // Creating a family requires an authenticated parent (OTP token in memory).
  // Unlike /portal/*, this route isn't behind <ProtectedRoute>, so guard here:
  // wait for the on-mount /auth/refresh to settle, then bounce to login if there
  // is still no session. Without this, a reload or an expired 15-min access token
  // drops the user onto the form and the first POST /families fails with a raw 401.
  // (Kept after all hooks so the Rules of Hooks hold on every render path.)
  if (!bootstrapped || (accessToken && me.isLoading)) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        Loading session…
      </div>
    );
  }
  if (!accessToken) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }
  // A kid should never be on the parent setup route — bounce to their surface.
  if (me.data?.kind === 'kid') {
    return <Navigate to="/learn" replace />;
  }
  // Family creation is parent-only (POST /families → 403 for any other role).
  // If this browser holds a teacher/admin/super_admin session (e.g. restored
  // from the shared `.airbotix.ai` refresh cookie), don't let the form submit
  // into a raw "Forbidden Exception" — explain it and offer a clean sign-out.
  if (me.data?.kind === 'user' && me.data.role !== 'parent') {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="mb-2">
            <span className="sticker-coral">Wrong account</span>
          </div>
          <h1 className="hero-display mt-6">Family setup is for parents.</h1>
          <p className="lead-text mt-4">
            You're signed in as <strong>{me.data.role}</strong> ({me.data.email}). Creating a
            family needs a parent account. Sign out and register with a different email.
          </p>
          <button
            onClick={async () => {
              await logout('user');
              nav('/portal/login', { replace: true });
            }}
            className="btn-pill-primary w-full mt-8"
          >
            Sign out & use a parent email →
          </button>
        </div>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      // §3.1 step 3 "[1] Your name" → set the parent's own name first, so the
      // account has an identity before the family exists.
      await api('/auth/me', {
        method: 'PATCH',
        body: { display_name: values.your_name.trim() },
      });
      const city = values.city?.trim();
      const postcode = values.postcode?.trim();
      const family = await api<CreatedFamily>('/families', {
        method: 'POST',
        body: {
          name: values.family_name,
          region: values.region,
          ...(city ? { city } : {}),
          ...(values.state ? { state: values.state } : {}),
          ...(postcode ? { postcode } : {}),
          ...(values.acquisition_source ? { acquisition_source: values.acquisition_source } : {}),
          preferred_language: values.preferred_language,
          ...(values.marketing_opt_in ? { marketing_opt_in: true } : {}),
          accept_terms: values.accept_terms,
        },
      });
      // The OTP-login token was minted before the family existed, so it carries
      // family_id=null. Refresh it now so the kid-creation call passes the
      // family-scope guard (otherwise POST /families/:id/kids → 403).
      await refreshAccessToken('user');
      await api<unknown>(`/families/${family.id}/kids`, {
        method: 'POST',
        body: {
          nickname: values.kid_nickname,
          age: values.kid_age,
          pin: values.kid_pin,
        },
      });
      // Show the success screen BEFORE invalidating `me`: the refetch makes
      // family_id non-null, and the arrive-with-family redirect above must
      // already see `created` set — otherwise it navs away, dropping the
      // family code and the threaded `from`.
      setCreated(family);
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'CONFLICT') {
        setError('You already have a family. Taking you back…');
        setTimeout(() => nav(afterCreateDest, { replace: true }), 1500);
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
            onClick={() => nav(afterCreateDest, { replace: true })}
            className="btn-pill-primary w-full mt-8"
          >
            {from ? 'Continue →' : 'Go to dashboard →'}
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
            <Field label="Your name" error={errors.your_name?.message}>
              <input
                className="input-k12"
                placeholder="Lightman Wang"
                autoComplete="name"
                {...register('your_name')}
              />
            </Field>
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
            <Field label="Which city are you in? (optional)" error={errors.city?.message}>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <CityField value={field.value ?? ''} onChange={field.onChange} />
                )}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Which state? (optional)" error={errors.state?.message}>
                <select className="input-k12" defaultValue="" {...register('state')}>
                  <option value="">Choose…</option>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Postcode (optional)" error={errors.postcode?.message}>
                <input
                  className="input-k12"
                  inputMode="numeric"
                  placeholder="2000"
                  autoComplete="postal-code"
                  {...register('postcode')}
                />
              </Field>
            </div>
            <Field label="Preferred language" error={errors.preferred_language?.message}>
              <select className="input-k12" {...register('preferred_language')}>
                {PREFERRED_LANGUAGES.map((lng) => (
                  <option key={lng} value={lng}>
                    {PREFERRED_LANGUAGE_LABELS[lng]}
                  </option>
                ))}
              </select>
            </Field>
          </section>

          <section className="space-y-4">
            <div className="eyebrow eyebrow-sunshine">How did you find us? (optional)</div>
            <Field label="How did you hear about us?" error={errors.acquisition_source?.message}>
              <select className="input-k12" defaultValue="" {...register('acquisition_source')}>
                <option value="">Choose one…</option>
                {ACQUISITION_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {ACQUISITION_SOURCE_LABELS[src]}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-brand-coral"
                {...register('marketing_opt_in')}
              />
              <span className="text-[13px] text-ink-soft">
                Send me tips &amp; updates about Airbotix. No spam — promise.
              </span>
            </label>
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

          <section className="space-y-2">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-0.5 h-5 w-5 accent-brand-coral"
                {...register('accept_terms')}
              />
              <span className="text-[13px] text-ink-soft">
                I am the parent or legal guardian of the kids on this account, and I agree to
                the{' '}
                <a
                  href="https://airbotix.ai/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Terms of Service
                </a>
                , the{' '}
                <a
                  href="https://airbotix.ai/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Privacy Policy
                </a>
                , and the{' '}
                <a
                  href="https://airbotix.ai/parental-consent"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Parental Consent
                </a>{' '}
                terms.
              </span>
            </label>
            {errors.accept_terms && (
              <span className="field-error">{errors.accept_terms.message}</span>
            )}
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
            We record the date and document version of your agreement. You can export or delete
            all your family's data anytime from Settings.
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
