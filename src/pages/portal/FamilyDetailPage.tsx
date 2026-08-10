import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { api, ApiError } from '@/lib/api';
import { SchoolField } from './SchoolField';
import { EMPTY_SCHOOL, type SchoolValue } from './schoolValue';
import { KidAvatar } from '@/components/KidAvatar';
import { KidAvatarPicker } from '@/components/KidAvatarPicker';
import { DEFAULT_KID_AVATAR_ID, type KidAvatarId } from '@/lib/kidAvatars';

interface Kid {
  id: string;
  nickname: string;
  avatar_id: string | null;
  age: number;
  real_name: string | null;
  daily_star_cap: number | null;
  is_active: boolean;
  family_id: string | null;
  school_name: string | null;
  school_suburb: string | null;
  school_state: string | null;
  school_acara_id: string | null;
}

// School fields sent on PATCH — always present (nullable) so clearing works.
interface SchoolPatch {
  school_name: string | null;
  school_suburb: string | null;
  school_state: string | null;
  school_acara_id: string | null;
}

interface KidAvatarSummary {
  id: string;
  avatar_id: string | null;
}

const editSchema = z.object({
  nickname: z.string().min(1).max(40),
  avatar_id: z.string(),
  age: z.coerce.number().int().min(4).max(17),
  daily_star_cap: z
    .union([z.literal(''), z.coerce.number().int().min(0).max(1000), z.null()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  is_active: z.boolean().optional(),
});
type EditValues = z.infer<typeof editSchema>;

const pinSchema = z.object({
  pin: z
    .string()
    .length(4)
    .regex(/^\d{4}$/, '4 digits'),
});
type PinValues = z.infer<typeof pinSchema>;

export function FamilyDetailPage() {
  const { kidId } = useParams<{ kidId: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [editError, setEditError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);
  // Optional school — a composite (autocomplete + state), so kept outside RHF and
  // seeded from the loaded kid.
  const [school, setSchool] = useState<SchoolValue>(EMPTY_SCHOOL);

  const kid = useQuery<Kid>({
    queryKey: ['kid', kidId],
    queryFn: () => api<Kid>(`/kids/${kidId}`),
    enabled: !!kidId,
  });
  const siblingAvatars = useQuery<KidAvatarSummary[]>({
    queryKey: ['family', kid.data?.family_id, 'kids'],
    queryFn: () => api<KidAvatarSummary[]>(`/families/${kid.data!.family_id}/kids`),
    enabled: !!kid.data?.family_id,
  });

  useEffect(() => {
    if (!kid.data) return;
    setSchool({
      name: kid.data.school_name ?? '',
      suburb: kid.data.school_suburb ?? '',
      state: kid.data.school_state ?? '',
      acara_id: kid.data.school_acara_id ?? '',
    });
  }, [kid.data]);

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: kid.data
      ? {
          nickname: kid.data.nickname,
          avatar_id: kid.data.avatar_id ?? DEFAULT_KID_AVATAR_ID,
          age: kid.data.age,
          daily_star_cap: kid.data.daily_star_cap,
          is_active: kid.data.is_active,
        }
      : undefined,
  });

  const pinForm = useForm<PinValues>({ resolver: zodResolver(pinSchema) });

  const editMutation = useMutation({
    mutationFn: (values: EditValues & SchoolPatch) =>
      api(`/kids/${kidId}`, { method: 'PATCH', body: values }),
    onSuccess: async () => {
      setEditError(null);
      await qc.invalidateQueries({ queryKey: ['kid', kidId] });
      await qc.invalidateQueries({ queryKey: ['family'] });
    },
    onError: (e: unknown) => {
      setEditError(e instanceof ApiError ? e.message : 'Update failed.');
    },
  });

  const pinMutation = useMutation({
    mutationFn: (values: PinValues) =>
      api(`/kids/${kidId}/reset-pin`, { method: 'POST', body: values }),
    onSuccess: () => {
      setPinError(null);
      setPinSuccess(true);
      pinForm.reset({ pin: '' });
      setTimeout(() => setPinSuccess(false), 3000);
    },
    onError: (e: unknown) => {
      setPinError(e instanceof ApiError ? e.message : 'Reset failed.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api(`/kids/${kidId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['family'] });
      nav('/portal/family', { replace: true });
    },
  });

  if (kid.isLoading) return <p className="lead-text">Loading…</p>;
  if (!kid.data)
    return (
      <div>
        <div className="eyebrow">Kid</div>
        <h1 className="section-heading">Not found</h1>
        <Link to="/portal/family" className="btn-pill-secondary mt-6">
          ← Back
        </Link>
      </div>
    );

  return (
    <div className="mx-auto w-full max-w-[1120px]">
      <nav
        className="mb-5 flex flex-wrap items-center gap-1 text-[13px] font-semibold text-slate2"
        aria-label="Kid profile navigation"
      >
        <Link to="/portal/family" className="btn-pill-ghost !px-3">
          ← My Family
        </Link>
        <span aria-hidden="true">/</span>
        <Link to={`/portal/family/${kidId}`} className="btn-pill-ghost !px-3">
          {kid.data.nickname}&apos;s growth
        </Link>
      </nav>

      <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <KidAvatar avatarId={kid.data.avatar_id} nickname={kid.data.nickname} size="lg" />
          <div className="min-w-0">
            <div className="eyebrow eyebrow-bubblegum">Kid profile</div>
            <h1 className="section-heading">Manage {kid.data.nickname}</h1>
            <p className="mt-2 text-[14px] font-medium text-ink-soft">
              Keep their identity, sign-in access and family details accurate.
            </p>
            <p className="mt-1 text-[12px] font-semibold text-slate2">
              Age {kid.data.age} · {kid.data.is_active ? 'Can sign in' : 'Sign-in paused'}
            </p>
          </div>
        </div>
        <span className={`sticker-${kid.data.is_active ? 'mint' : 'sunshine'} self-start`}>
          {kid.data.is_active ? 'Active' : 'Paused'}
        </span>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          onSubmit={editForm.handleSubmit((v) =>
            editMutation.mutate({
              ...v,
              // Empty → null so a cleared school field is actually cleared.
              school_name: school.name.trim() || null,
              school_suburb: school.suburb.trim() || null,
              school_state: school.state || null,
              school_acara_id: school.acara_id || null,
            }),
          )}
          className="min-w-0 space-y-6"
        >
          <section className="card-base" aria-labelledby="basic-details-heading">
            <span className="sticker-sky alt">Profile</span>
            <h2 id="basic-details-heading" className="mt-5 text-[24px] font-bold text-ink">
              Basic details
            </h2>
            <p className="mt-2 text-[13px] font-medium text-slate2">
              These are the details your family sees when choosing the right child profile.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="label-k12">Nickname</span>
                <input className="input-k12" {...editForm.register('nickname')} />
                {editForm.formState.errors.nickname && (
                  <span className="field-error">{editForm.formState.errors.nickname.message}</span>
                )}
              </label>
              <label className="block">
                <span className="label-k12">Age</span>
                <input
                  type="number"
                  min={4}
                  max={17}
                  className="input-k12"
                  {...editForm.register('age')}
                />
                {editForm.formState.errors.age && (
                  <span className="field-error">{editForm.formState.errors.age.message}</span>
                )}
              </label>
            </div>
          </section>

          <section className="card-base" aria-labelledby="avatar-heading">
            <div className="mb-5">
              <span className="sticker-bubblegum">Their look</span>
              <h2 id="avatar-heading" className="mt-5 text-[24px] font-bold text-ink">
                Avatar
              </h2>
              <p className="mt-2 text-[13px] font-medium text-slate2">
                Pick something easy for {kid.data.nickname} to recognise at sign-in.
              </p>
            </div>
            <Controller
              name="avatar_id"
              control={editForm.control}
              render={({ field }) => (
                <KidAvatarPicker
                  wide
                  value={field.value as KidAvatarId}
                  onChange={field.onChange}
                  usedAvatarIds={(siblingAvatars.data ?? [])
                    .filter((sibling) => sibling.id !== kidId)
                    .map((sibling) => sibling.avatar_id ?? '')}
                />
              )}
            />
          </section>

          <section className="card-base" aria-labelledby="access-limits-heading">
            <span className="sticker-sunshine">Access &amp; limits</span>
            <h2 id="access-limits-heading" className="mt-5 text-[24px] font-bold text-ink">
              Access &amp; limits
            </h2>
            <p className="mt-2 text-[13px] font-medium text-slate2">
              Control whether this child can sign in and optionally set a lower daily Stars limit.
            </p>

            <div className="mt-5 grid items-start gap-5 md:grid-cols-2">
              <div className="space-y-5">
                <label className="block">
                  <span className="label-k12">Daily Stars cap (optional)</span>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    aria-label="Daily Stars cap (optional)"
                    placeholder="Leave empty to use family cap"
                    className="input-k12"
                    {...editForm.register('daily_star_cap')}
                  />
                  <span className="mt-2 block text-[12px] font-medium text-slate2">
                    This can be lower than the family cap. Leave it empty to inherit the family
                    setting.
                  </span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-wash-mint p-4">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 rounded accent-brand-coral"
                    {...editForm.register('is_active')}
                  />
                  <span>
                    <span className="block text-[14px] font-bold text-ink">
                      Active — kid can sign in
                    </span>
                    <span className="mt-1 block text-[12px] font-medium leading-relaxed text-slate2">
                      Turn this off to pause new sessions. Their profile and growth history stay
                      available.
                    </span>
                  </span>
                </label>
              </div>
              <div className="rounded-2xl bg-surface p-4">
                <SchoolField value={school} onChange={setSchool} />
                <p className="mt-3 text-[12px] font-medium leading-relaxed text-slate2">
                  School is optional and helps match future class and local-program information.
                </p>
              </div>
            </div>
          </section>

          <div className="card-base flex flex-col gap-4 !bg-wash-mint sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[16px] font-bold text-ink">Ready to save?</h2>
              <p className="mt-1 text-[12px] font-medium text-slate2">
                Nickname, avatar, age, access, limits and school are saved together.
              </p>
            </div>
            <button
              type="submit"
              disabled={editMutation.isPending}
              className="btn-pill-primary shrink-0"
            >
              {editMutation.isPending ? 'Saving…' : 'Save profile changes'}
            </button>
          </div>

          {editError && (
            <div className="rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-medium text-ink">
              {editError}
            </div>
          )}
          {editMutation.isSuccess && (
            <div className="rounded-2xl border border-brand-mint/30 bg-wash-mint px-4 py-3 text-[13px] font-medium text-ink">
              Saved ✓
            </div>
          )}
        </form>

        <aside className="space-y-6 lg:sticky lg:top-8" aria-label="Sign-in and safety settings">
          <form
            onSubmit={pinForm.handleSubmit((v) => pinMutation.mutate(v))}
            className="card-base space-y-5 !bg-wash-sky"
          >
            <span className="sticker-sky alt">Sign-in safety</span>
            <div>
              <h2 className="mt-5 text-[20px] font-bold text-ink">Set a new kid PIN</h2>
              <p className="mt-2 text-[13px] font-medium leading-relaxed text-slate2">
                Use four digits the child can remember but other children cannot easily guess.
                Resetting it signs out all of this kid&apos;s devices.
              </p>
            </div>
            <label className="block">
              <span className="label-k12">New 4-digit PIN</span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                className="input-k12 bg-canvas-pure text-center font-mono tracking-[0.4em]"
                placeholder="••••"
                autoComplete="off"
                {...pinForm.register('pin')}
              />
              {pinForm.formState.errors.pin && (
                <span className="field-error">{pinForm.formState.errors.pin.message}</span>
              )}
            </label>
            {pinError && (
              <div className="rounded-2xl border border-brand-coral/30 bg-wash-coral px-4 py-3 text-[13px] font-medium text-ink">
                {pinError}
              </div>
            )}
            {pinSuccess && (
              <div className="rounded-2xl border border-brand-mint/30 bg-wash-mint px-4 py-3 text-[13px] font-medium text-ink">
                PIN updated ✓
              </div>
            )}
            <button
              type="submit"
              disabled={pinMutation.isPending}
              className="btn-pill-primary w-full"
            >
              {pinMutation.isPending ? 'Resetting…' : 'Reset PIN'}
            </button>
          </form>

          <section
            className="card-base border-2 border-brand-coral/25"
            aria-labelledby="delete-kid-heading"
          >
            <div className="eyebrow">Need to remove this kid profile?</div>
            <h3 id="delete-kid-heading" className="mt-1 text-[18px] font-bold text-ink">
              Delete this kid
            </h3>
            <p className="mt-2 text-[13px] font-medium leading-relaxed text-slate2">
              This signs the child out and soft-deletes the profile. An administrator can restore it
              within 30 days.
            </p>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete ${kid.data!.nickname}?`)) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="mt-4 inline-flex items-center justify-center rounded-full border-2 border-danger-600 px-6 py-2.5 text-[13px] font-semibold text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
