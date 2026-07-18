import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { api, ApiError } from '@/lib/api';

// Claim a walk-in workshop kid by kid code (auth-system-prd §5.2). The parent
// types the code from the workshop plus what the walk-in account was created
// without: a real age (min 6, C2 compliance) and a PIN. Nickname is optional —
// only needed when it collides with a kid already in the family.
const schema = z.object({
  claim_code: z
    .string()
    .trim()
    .min(6, 'That looks too short')
    .max(20)
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Letters and numbers only'),
  age: z.coerce.number().int().min(6, 'Airbotix is for ages 6+').max(17),
  pin: z.string().length(4).regex(/^\d{4}$/, '4 digits'),
  nickname: z
    .union([z.literal(''), z.string().min(1).max(40)])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : v)),
});
type FormValues = z.infer<typeof schema>;

export interface ClaimedKid {
  id: string;
  nickname: string;
}

export function ClaimKidForm({
  familyId,
  onClaimed,
}: {
  familyId: string;
  onClaimed: (kid: ClaimedKid) => void | Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [nicknameConflict, setNicknameConflict] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const kid = await api<ClaimedKid>(`/families/${familyId}/kids/claim`, {
        method: 'POST',
        body: {
          claim_code: values.claim_code,
          age: values.age,
          pin: values.pin,
          ...(values.nickname ? { nickname: values.nickname } : {}),
        },
      });
      await onClaimed(kid);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'NICKNAME_TAKEN') {
        setNicknameConflict(true);
        setError('That nickname is already used in your family — pick a new one below.');
      } else if (e instanceof ApiError && e.code === 'INVALID_CLAIM_CODE') {
        setError("That kid code doesn't match — check it with the teacher and try again.");
      } else {
        setError(e instanceof ApiError ? e.message : 'Could not claim the kid — try again.');
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      data-testid="claim-kid-form"
    >
      <p className="text-[14px] text-slate2">
        Got a <span className="font-semibold">kid code</span> from an Airbotix workshop? Enter it
        here to add that kid — and everything they made — to your family.
      </p>
      <label className="block">
        <span className="label-k12">Kid code</span>
        <input
          className="input-k12 font-mono uppercase tracking-widest"
          placeholder="ABCD-EFGH-12"
          autoComplete="off"
          {...register('claim_code')}
        />
        {errors.claim_code && <span className="field-error">{errors.claim_code.message}</span>}
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="label-k12">Age</span>
          <input type="number" min={6} max={17} className="input-k12" {...register('age')} />
          {errors.age && <span className="field-error">{errors.age.message}</span>}
        </label>
        <label className="block">
          <span className="label-k12">New 4-digit PIN</span>
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
        <span className="label-k12">
          Nickname {nicknameConflict ? '(pick a new one)' : '(optional — keeps the workshop one)'}
        </span>
        <input className="input-k12" autoComplete="off" {...register('nickname')} />
        {errors.nickname && <span className="field-error">{errors.nickname.message}</span>}
      </label>

      {error && (
        <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-pill-primary">
        {isSubmitting ? 'Claiming…' : 'Claim my kid →'}
      </button>
    </form>
  );
}
