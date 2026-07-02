import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { kidLogin } from '@/auth/useAuth';
import type { StoredClassLoginRequest } from '@/auth/types';
import { ApiError } from '@/lib/api';
import { ClassLoginForm } from './ClassLoginForm';
import { ClassLoginWaiting } from './ClassLoginWaiting';

const schema = z.object({
  family_code: z.string().min(4).max(12),
  nickname: z.string().min(1).max(40),
  pin: z.string().length(4).regex(/^\d{4}$/, '4 digits'),
});
type FormValues = z.infer<typeof schema>;

type LoginMode = 'family' | 'class';

// A pending class-login request survives a reload so the kid lands back on the
// waiting screen instead of silently dropping the request (§5.3).
const CLASS_LOGIN_STORAGE_KEY = 'airbotix.classLoginRequest';

function loadStoredRequest(): StoredClassLoginRequest | null {
  try {
    const raw = sessionStorage.getItem(CLASS_LOGIN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredClassLoginRequest;
    if (!parsed.request_id || !parsed.secret) return null;
    if (new Date(parsed.expires_at).getTime() < Date.now()) {
      sessionStorage.removeItem(CLASS_LOGIN_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function LoginPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // A live pending request forces class mode + the waiting screen on load.
  const [classRequest, setClassRequest] = useState<StoredClassLoginRequest | null>(
    loadStoredRequest,
  );
  const [mode, setMode] = useState<LoginMode>(classRequest ? 'class' : 'family');
  // Pre-fill the family code when arriving from a parent's shared link / QR
  // (/learn/login?family_code=XXXX), so the kid only types nickname + PIN.
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { family_code: (sp.get('family_code') ?? '').toUpperCase() },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      await kidLogin(values.family_code, values.nickname, values.pin);
      nav('/learn', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not sign in.');
    }
  };

  const startClassRequest = (req: StoredClassLoginRequest) => {
    sessionStorage.setItem(CLASS_LOGIN_STORAGE_KEY, JSON.stringify(req));
    setClassRequest(req);
  };

  const exitClassRequest = () => {
    sessionStorage.removeItem(CLASS_LOGIN_STORAGE_KEY);
    setClassRequest(null);
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

        <div
          className="mt-6 flex gap-1 rounded-full bg-surface p-1.5"
          role="tablist"
          aria-label="How do you want to sign in?"
        >
          <ModeTab
            active={mode === 'family'}
            onClick={() => setMode('family')}
            label="👪 Family code"
          />
          <ModeTab active={mode === 'class'} onClick={() => setMode('class')} label="🏫 At class" />
        </div>

        {mode === 'family' ? (
          <>
            <p className="lead-text mt-4">
              Type your family code, your nickname, and your 4-digit PIN.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
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
          </>
        ) : classRequest ? (
          <ClassLoginWaiting request={classRequest} onExit={exitClassRequest} />
        ) : (
          <>
            <p className="lead-text mt-4">
              Forgot your codes? Type the class code from the board and your name — your teacher
              will let you in.
            </p>
            <ClassLoginForm onRequested={startClassRequest} />
          </>
        )}

        <div className="mt-8 space-y-2 text-center text-[13px] text-slate2">
          <div>
            Workshop today?{' '}
            <Link
              to="/learn/class-code"
              className="font-semibold text-brand-bubblegum hover:underline"
            >
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

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  // Segmented control matching the Learn surface (same recipe as the My Works
  // chips): white active pill on a warm `surface` track — never heavy ink fills.
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={clsx(
        'flex-1 rounded-full px-4 py-2.5 text-[14px] font-bold transition-colors',
        active
          ? 'bg-canvas-pure text-ink shadow-card-soft'
          : 'text-slate2 hover:text-ink hover:bg-wash-coral',
      )}
    >
      {label}
    </button>
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
