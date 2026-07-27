import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { School, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { clearKidDeviceHint, loadKidDeviceHint } from '@/auth/kidDeviceHint';
import { kidDeviceLogin, kidLogin, previewKidDevice } from '@/auth/useAuth';
import type { KidDeviceIdentity, StoredClassLoginRequest } from '@/auth/types';
import { AuthIdentityLayout } from '@/components/auth/AuthIdentityLayout';
import { KidAvatar } from '@/components/KidAvatar';
import { ApiError } from '@/lib/api';
import { ClassLoginForm } from './ClassLoginForm';
import { ClassLoginWaiting } from './ClassLoginWaiting';

const schema = z.object({
  family_code: z.string().min(4).max(12),
  nickname: z.string().min(1).max(40),
  pin: z
    .string()
    .length(4)
    .regex(/^\d{4}$/, '4 digits'),
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
  const [deviceHint, setDeviceHint] = useState(loadKidDeviceHint);
  const [rememberedKid, setRememberedKid] = useState<KidDeviceIdentity | null>(null);
  const [checkingDevice, setCheckingDevice] = useState(deviceHint !== null);
  const [trustedPin, setTrustedPin] = useState('');
  const [trustedBusy, setTrustedBusy] = useState(false);
  const [familyStep, setFamilyStep] = useState<'code' | 'credentials'>(
    sp.get('family_code') ? 'credentials' : 'code',
  );
  // Pre-fill the family code when arriving from a parent's shared link / QR
  // (/learn/login?family_code=XXXX), so the kid only types nickname + PIN.
  const {
    register,
    handleSubmit,
    trigger,
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

  useEffect(() => {
    let current = true;
    if (!deviceHint) {
      setCheckingDevice(false);
      return;
    }
    previewKidDevice(deviceHint)
      .then((kid) => {
        if (current) setRememberedKid(kid);
      })
      .catch(() => {
        clearKidDeviceHint();
        if (current) setDeviceHint(null);
      })
      .finally(() => {
        if (current) setCheckingDevice(false);
      });
    return () => {
      current = false;
    };
  }, [deviceHint]);

  const onTrustedSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deviceHint || !/^\d{4}$/.test(trustedPin)) {
      setError('Enter your 4-digit PIN.');
      return;
    }
    setTrustedBusy(true);
    setError(null);
    try {
      await kidDeviceLogin(deviceHint, trustedPin);
      nav('/learn', { replace: true });
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not sign in.');
      setTrustedBusy(false);
    }
  };

  const useDifferentAccount = () => {
    clearKidDeviceHint();
    setDeviceHint(null);
    setRememberedKid(null);
    setTrustedPin('');
    setError(null);
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
    <AuthIdentityLayout activeRole="kid">
      <div>
        <span className="sticker-bubblegum">Kids sign in here</span>
      </div>
      <h1 className="hero-display mt-6">
        Ready to <span className="squiggle-word">make</span> something?
      </h1>

      <div
        className="mt-6 flex gap-1 rounded-full bg-surface p-1.5"
        role="tablist"
        aria-label="How do you want to sign in?"
      >
        <ModeTab
          active={mode === 'family'}
          onClick={() => setMode('family')}
          icon={<Users size={16} strokeWidth={2.5} />}
          label="Family code"
        />
        <ModeTab
          active={mode === 'class'}
          onClick={() => setMode('class')}
          icon={<School size={16} strokeWidth={2.5} />}
          label="At class"
        />
      </div>

      {mode === 'family' ? (
        checkingDevice ? (
          <p className="lead-text mt-5">Finding your kids page…</p>
        ) : rememberedKid && deviceHint ? (
          <div className="mt-6 text-center">
            <div className="flex justify-center">
              <KidAvatar
                avatarId={rememberedKid.avatar_id}
                nickname={rememberedKid.nickname}
                size="xl"
              />
            </div>
            <h2 className="mt-4 text-[28px] font-bold text-ink">
              Hi {rememberedKid.nickname}!
            </h2>
            <p className="lead-text mt-2">Enter your 4-digit PIN to continue.</p>
            <form onSubmit={onTrustedSubmit} className="mt-5">
              <Field label="My PIN">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={trustedPin}
                  onChange={(event) => setTrustedPin(event.target.value.replace(/\D/g, ''))}
                  className="input-k12 font-mono text-center tracking-[0.5em] text-[24px]"
                  placeholder="••••"
                  autoComplete="off"
                  aria-label={`${rememberedKid.nickname}'s PIN`}
                />
              </Field>
              {error && (
                <div className="mt-4 rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-medium text-ink">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={trustedBusy}
                className="btn-pill-primary mt-5 w-full"
              >
                {trustedBusy ? 'Signing in…' : `Continue as ${rememberedKid.nickname} →`}
              </button>
            </form>
            <button
              type="button"
              className="btn-pill-ghost mt-4"
              onClick={useDifferentAccount}
            >
              Use a different account
            </button>
          </div>
        ) : (
        <>
          <p className="lead-text mt-4">
            {familyStep === 'code'
              ? 'Start with the family code your parent gave you.'
              : 'Now type your nickname and 4-digit PIN.'}
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
            {familyStep === 'code' ? (
              <>
                <Field label="Family code" error={errors.family_code?.message}>
                  <input
                    className="input-k12 font-mono uppercase text-[20px] tracking-[0.2em]"
                    placeholder="WANG"
                    autoComplete="off"
                    autoCapitalize="characters"
                    {...register('family_code')}
                  />
                </Field>
                <button
                  type="button"
                  className="btn-pill-primary w-full"
                  onClick={async () => {
                    if (await trigger('family_code')) setFamilyStep('credentials');
                  }}
                >
                  Next →
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-pill-ghost -ml-3"
                  onClick={() => setFamilyStep('code')}
                >
                  ← Change family code
                </button>
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
              </>
            )}
          </form>
        </>
        )
      ) : classRequest ? (
        <ClassLoginWaiting request={classRequest} onExit={exitClassRequest} />
      ) : (
        <>
          <p className="lead-text mt-4">
            Forgot your codes? Type the class code from the board and your name — your teacher will
            let you in.
          </p>
          <ClassLoginForm onRequested={startClassRequest} />
        </>
      )}

      <div className="mt-8 text-center text-[13px] text-slate2">
        <div>
          Workshop today?{' '}
          <Link
            to="/learn/class-code"
            className="font-semibold text-brand-bubblegum hover:underline"
          >
            Use a class code →
          </Link>
        </div>
      </div>
    </AuthIdentityLayout>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
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
        'flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-bold transition-colors',
        active
          ? 'bg-canvas-pure text-ink shadow-card-soft'
          : 'text-slate2 hover:text-ink hover:bg-wash-coral',
      )}
    >
      {icon}
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
