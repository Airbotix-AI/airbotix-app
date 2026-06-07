import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { api, ApiError } from '@/lib/api';

interface Kid {
  id: string;
  nickname: string;
  age: number;
  real_name: string | null;
  daily_star_cap: number | null;
  is_active: boolean;
  family_id: string | null;
}

const editSchema = z.object({
  nickname: z.string().min(1).max(40),
  age: z.coerce.number().int().min(4).max(17),
  daily_star_cap: z
    .union([z.literal(''), z.coerce.number().int().min(0).max(1000), z.null()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? null : v)),
  is_active: z.boolean().optional(),
});
type EditValues = z.infer<typeof editSchema>;

const pinSchema = z.object({
  pin: z.string().length(4).regex(/^\d{4}$/, '4 digits'),
});
type PinValues = z.infer<typeof pinSchema>;

export function FamilyDetailPage() {
  const { kidId } = useParams<{ kidId: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [editError, setEditError] = useState<string | null>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState(false);

  const kid = useQuery<Kid>({
    queryKey: ['kid', kidId],
    queryFn: () => api<Kid>(`/kids/${kidId}`),
    enabled: !!kidId,
  });

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: kid.data
      ? {
          nickname: kid.data.nickname,
          age: kid.data.age,
          daily_star_cap: kid.data.daily_star_cap,
          is_active: kid.data.is_active,
        }
      : undefined,
  });

  const pinForm = useForm<PinValues>({ resolver: zodResolver(pinSchema) });

  const editMutation = useMutation({
    mutationFn: (values: EditValues) =>
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
        <Link to="/portal/family" className="btn-pill-secondary mt-6">← Back</Link>
      </div>
    );

  return (
    <div>
      <Link to={`/portal/family/${kidId}`} className="btn-pill-ghost mb-4 -ml-3">← Growth</Link>

      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-bubblegum">Kid profile</div>
          <h1 className="section-heading">{kid.data.nickname}</h1>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            Age {kid.data.age} {kid.data.is_active ? '· Active' : '· Paused'}
          </p>
        </div>
        <span className={`sticker-${kid.data.is_active ? 'mint' : 'sunshine'}`}>
          {kid.data.is_active ? 'Active' : 'Paused'}
        </span>
      </div>

      <form
        onSubmit={editForm.handleSubmit((v) => editMutation.mutate(v))}
        className="card-base space-y-5 mb-8"
        style={{ maxWidth: '520px' }}
      >
        <div className="eyebrow eyebrow-sky">Edit profile</div>

        <label className="block">
          <span className="label-k12">Nickname</span>
          <input className="input-k12" {...editForm.register('nickname')} />
          {editForm.formState.errors.nickname && (
            <span className="field-error">{editForm.formState.errors.nickname.message}</span>
          )}
        </label>
        <label className="block">
          <span className="label-k12">Age</span>
          <input type="number" min={4} max={17} className="input-k12" {...editForm.register('age')} />
          {editForm.formState.errors.age && (
            <span className="field-error">{editForm.formState.errors.age.message}</span>
          )}
        </label>
        <label className="block">
          <span className="label-k12">Daily Stars cap (optional)</span>
          <input
            type="number"
            min={0}
            max={1000}
            placeholder="leave empty to inherit family cap"
            className="input-k12"
            {...editForm.register('daily_star_cap')}
          />
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-5 w-5 rounded accent-brand-coral" {...editForm.register('is_active')} />
          <span className="text-[14px] font-semibold text-ink">Active (kid can sign in)</span>
        </label>

        {editError && (
          <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {editError}
          </div>
        )}
        {editMutation.isSuccess && (
          <div className="rounded-2xl bg-wash-mint border border-brand-mint/30 px-4 py-3 text-[13px] font-medium text-ink">
            Saved ✓
          </div>
        )}

        <button type="submit" disabled={editMutation.isPending} className="btn-pill-primary">
          {editMutation.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <form
        onSubmit={pinForm.handleSubmit((v) => pinMutation.mutate(v))}
        className="card-base space-y-5 mb-8"
        style={{ maxWidth: '520px' }}
      >
        <div className="eyebrow eyebrow-sunshine">Reset PIN</div>
        <p className="text-[13px] text-slate2 -mt-2">
          Resetting the PIN signs out all of this kid's devices.
        </p>
        <label className="block">
          <span className="label-k12">New 4-digit PIN</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={4}
            className="input-k12 font-mono tracking-[0.4em] text-center"
            placeholder="••••"
            autoComplete="off"
            {...pinForm.register('pin')}
          />
          {pinForm.formState.errors.pin && (
            <span className="field-error">{pinForm.formState.errors.pin.message}</span>
          )}
        </label>
        {pinError && (
          <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {pinError}
          </div>
        )}
        {pinSuccess && (
          <div className="rounded-2xl bg-wash-mint border border-brand-mint/30 px-4 py-3 text-[13px] font-medium text-ink">
            PIN updated ✓
          </div>
        )}
        <button type="submit" disabled={pinMutation.isPending} className="btn-pill-primary">
          {pinMutation.isPending ? 'Resetting…' : 'Reset PIN'}
        </button>
      </form>

      <div className="card-base" style={{ maxWidth: '520px' }}>
        <div className="eyebrow">Danger zone</div>
        <h3 className="text-[18px] font-bold text-ink mt-1">Delete this kid</h3>
        <p className="text-[13px] text-slate2 mt-2">
          Soft-deletes the profile and signs them out. You can restore from admin within 30 days.
        </p>
        <button
          onClick={() => {
            if (confirm(`Delete ${kid.data!.nickname}?`)) deleteMutation.mutate();
          }}
          disabled={deleteMutation.isPending}
          className="mt-4 inline-flex items-center justify-center rounded-full border-2 border-danger-600 px-6 py-2.5 text-[13px] font-semibold text-danger-600 hover:bg-danger-600 hover:text-white transition-colors disabled:opacity-50"
        >
          {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}
