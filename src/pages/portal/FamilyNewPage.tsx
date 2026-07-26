import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';
import { ClaimKidForm } from './ClaimKidForm';
import { SchoolField } from './SchoolField';
import { EMPTY_SCHOOL, type SchoolValue } from './schoolValue';

const schema = z.object({
  nickname: z.string().min(1).max(40),
  // Backend minimum age is 6 (D-SP8 / C2 compliance) — keep the client aligned.
  age: z.coerce.number().int().min(6, 'Airbotix is for ages 6+').max(17),
  pin: z.string().length(4).regex(/^\d{4}$/, '4 digits'),
  daily_star_cap: z
    .union([z.literal(''), z.coerce.number().int().min(0).max(1000)])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
});
type FormValues = z.infer<typeof schema>;

export function FamilyNewPage() {
  const me = useMe();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  // Optional school attribution — kept outside react-hook-form because it is a
  // composite (autocomplete + state) rather than a single registered input.
  const [school, setSchool] = useState<SchoolValue>(EMPTY_SCHOOL);
  // 'new' = create a fresh kid; 'claim' = claim a walk-in workshop kid by kid
  // code (auth-system-prd §5.2).
  const [mode, setMode] = useState<'new' | 'claim'>('new');

  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  if (!familyId) {
    return (
      <div>
        <div className="eyebrow">Add kid</div>
        <h1 className="section-heading">Set up your family first</h1>
        <Link to="/portal/register" className="btn-pill-primary mt-6">Start setup →</Link>
      </div>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const schoolName = school.name.trim();
      await api(`/families/${familyId}/kids`, {
        method: 'POST',
        body: {
          nickname: values.nickname,
          age: values.age,
          pin: values.pin,
          ...(values.daily_star_cap !== undefined ? { daily_star_cap: values.daily_star_cap } : {}),
          // Only send school fields that carry a value.
          ...(schoolName ? { school_name: schoolName } : {}),
          ...(school.suburb ? { school_suburb: school.suburb } : {}),
          ...(school.state ? { school_state: school.state } : {}),
          ...(school.acara_id ? { school_acara_id: school.acara_id } : {}),
        },
      });
      await qc.invalidateQueries({ queryKey: ['family', familyId, 'kids'] });
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      nav('/portal/family', { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add kid.');
    }
  };

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow eyebrow-bubblegum">Add kid</div>
        <h1 className="section-heading">A new <span className="squiggle-word">kid</span></h1>
        <p className="lead-text mt-3" style={{ fontSize: '16px' }}>
          Up to 5 kids per family. PINs are private — kids type them at sign in.
        </p>
      </div>

      <div className="mb-5 flex gap-2" role="tablist" aria-label="How to add the kid">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'new'}
          onClick={() => setMode('new')}
          className={mode === 'new' ? 'btn-pill-primary' : 'btn-pill-ghost'}
        >
          New kid
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'claim'}
          onClick={() => setMode('claim')}
          className={mode === 'claim' ? 'btn-pill-primary' : 'btn-pill-ghost'}
        >
          I have a kid code
        </button>
      </div>

      {mode === 'claim' ? (
        <div className="card-base" style={{ maxWidth: '520px' }}>
          <ClaimKidForm
            familyId={familyId}
            onClaimed={async () => {
              await qc.invalidateQueries({ queryKey: ['family', familyId, 'kids'] });
              await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
              nav('/portal/family', { replace: true });
            }}
          />
        </div>
      ) : (
      <form onSubmit={handleSubmit(onSubmit)} className="card-base space-y-5" style={{ maxWidth: '520px' }}>
        <label className="block">
          <span className="label-k12">Nickname</span>
          <input className="input-k12" placeholder="Mia" autoComplete="off" {...register('nickname')} />
          {errors.nickname && <span className="field-error">{errors.nickname.message}</span>}
        </label>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="label-k12">Age</span>
            <input type="number" min={4} max={17} className="input-k12" {...register('age')} />
            {errors.age && <span className="field-error">{errors.age.message}</span>}
          </label>
          <label className="block">
            <span className="label-k12">4-digit PIN</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              className="input-k12 font-mono tracking-[0.4em] text-center"
              placeholder="••••"
              autoComplete="off"
              {...register('pin')}
            />
            {errors.pin && <span className="field-error">{errors.pin.message}</span>}
          </label>
        </div>
        <label className="block">
          <span className="label-k12">Daily Stars cap (optional)</span>
          <input
            type="number"
            min={0}
            max={1000}
            placeholder="leave empty to inherit family cap"
            className="input-k12"
            {...register('daily_star_cap')}
          />
          {errors.daily_star_cap && <span className="field-error">{errors.daily_star_cap.message}</span>}
        </label>

        <SchoolField value={school} onChange={setSchool} />

        {error && (
          <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="btn-pill-primary">
            {isSubmitting ? 'Adding…' : 'Add kid →'}
          </button>
          <Link to="/portal/family" className="btn-pill-secondary">Cancel</Link>
        </div>
      </form>
      )}
    </div>
  );
}
