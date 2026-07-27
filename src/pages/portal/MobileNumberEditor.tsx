import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { api, ApiError } from '@/lib/api';
import { australianMobileSchema } from '@/lib/phone';

const schema = z.object({ phone: australianMobileSchema });
type FormValues = z.infer<typeof schema>;

export function MobileNumberEditor({
  current,
  onSaved,
  allowClear = true,
}: {
  current: string | null;
  onSaved?: () => void;
  allowClear?: boolean;
}) {
  const qc = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { phone: current ?? '' },
  });

  useEffect(() => {
    form.reset({ phone: current ?? '' });
  }, [current, form]);

  const mutation = useMutation({
    mutationFn: (phone: string | null) => api('/auth/me', { method: 'PATCH', body: { phone } }),
    onSuccess: async () => {
      setSaveError(null);
      await qc.invalidateQueries({ queryKey: ['auth', 'me', 'user'] });
      onSaved?.();
    },
    onError: (error: unknown) =>
      setSaveError(error instanceof ApiError ? error.message : 'Could not save your mobile.'),
  });

  return (
    <form
      onSubmit={form.handleSubmit(({ phone }) => mutation.mutate(phone.trim()))}
      className="mt-3 space-y-2"
    >
      <label className="block">
        <span className="sr-only">Mobile number</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            className="input-k12 min-w-0 py-2 text-[14px]"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0400 000 000"
            {...form.register('phone')}
          />
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-pill-secondary px-5 py-2 text-[13px]"
          >
            {mutation.isPending ? 'Saving…' : 'Save'}
          </button>
          {allowClear && current && (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate(null)}
              className="btn-pill-ghost px-4 py-2 text-[13px]"
            >
              Clear
            </button>
          )}
        </div>
      </label>
      <p className="text-[12px] font-medium text-slate2">
        For class updates and support. No SMS verification yet.
      </p>
      {form.formState.errors.phone && (
        <p className="field-error">{form.formState.errors.phone.message}</p>
      )}
      {saveError && <p className="field-error">{saveError}</p>}
      {mutation.isSuccess && !saveError && (
        <p className="text-[12px] font-semibold text-brand-mint">Mobile saved ✓</p>
      )}
    </form>
  );
}
