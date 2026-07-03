import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { createClassLoginRequest } from '@/auth/useAuth';
import type { StoredClassLoginRequest } from '@/auth/types';
import { ApiError } from '@/lib/api';

const schema = z.object({
  class_code: z.string().min(4).max(12),
  typed_name: z.string().trim().min(1).max(40),
});
type FormValues = z.infer<typeof schema>;

// Kid-friendly copy per backend error code (auth-system-prd §5.3).
function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'NO_CLASS_SESSION_NOW') {
      return "It's not class time right now — ask your teacher when to try.";
    }
    if (e.code === 'INVALID_CLASS_CODE') {
      return "Hmm, that code doesn't look right. Check the board and try again.";
    }
    if (e.status === 429) {
      return 'Too many tries — take a little break and try again soon.';
    }
  }
  return 'Could not send your request. Try again.';
}

// "At class" login (auth-system-prd §5.3): class code + the kid's name creates a
// pending request that the teacher approves; identity comes from the teacher's
// roster pick, so the name here is free text.
export function ClassLoginForm({
  onRequested,
}: {
  onRequested: (req: StoredClassLoginRequest) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const res = await createClassLoginRequest(values.class_code, values.typed_name);
      onRequested({
        request_id: res.request_id,
        secret: res.secret,
        expires_at: res.expires_at,
        class_name: res.class_name,
      });
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
      <label className="block">
        <span className="label-k12">Class code</span>
        <input
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={12}
          className="input-k12 font-mono text-center tracking-[0.3em] text-[28px] uppercase"
          placeholder="ABC-D1"
          {...register('class_code')}
        />
        {errors.class_code && <span className="field-error">{errors.class_code.message}</span>}
      </label>

      <label className="block">
        <span className="label-k12">What's your name?</span>
        <input
          type="text"
          autoComplete="off"
          className="input-k12"
          placeholder="Mia"
          {...register('typed_name')}
        />
        {errors.typed_name && <span className="field-error">{errors.typed_name.message}</span>}
      </label>

      {error && (
        <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
          {error}
        </div>
      )}

      <button type="submit" disabled={isSubmitting} className="btn-pill-primary w-full">
        {isSubmitting ? 'Asking…' : 'Ask my teacher →'}
      </button>
    </form>
  );
}
