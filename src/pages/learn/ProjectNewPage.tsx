import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { useMe } from '@/auth/useAuth';
import { api, ApiError } from '@/lib/api';

const schema = z.object({
  title: z.string().min(1).max(120),
  product_line: z.enum(['line_a_creative', 'line_b_coding']),
});
type FormValues = z.infer<typeof schema>;

interface LocationState {
  mission_id?: string;
  mission_slug?: string;
  title?: string;
}

export function ProjectNewPage() {
  const nav = useNavigate();
  const location = useLocation();
  const state = (location.state as LocationState | undefined) ?? {};
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;
  const [error, setError] = useState<string | null>(null);

  // Class context (from the class hub's "Create for this class" sheet): the new
  // project is attached to this class after creation (visibility=class_work) so
  // it shows under the class's "My work". Absent = a personal project.
  const [sp] = useSearchParams();
  const classId = sp.get('class');
  const presetLine = sp.get('line') === 'line_b_coding' ? 'line_b_coding' : 'line_a_creative';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: state.title ?? '',
      product_line: classId ? presetLine : 'line_a_creative',
    },
  });
  const productLine = watch('product_line');
  const color = productLine === 'line_a_creative' ? 'coral' : 'sky';

  const onSubmit = async (values: FormValues) => {
    setError(null);
    try {
      const project = await api<{ id: string }>(`/projects`, {
        method: 'POST',
        body: {
          title: values.title,
          product_line: values.product_line,
          ...(state.mission_id ? { mission_id: state.mission_id } : {}),
          ...(kidId ? { kid_id: kidId } : {}),
          ...(familyId ? { family_id: familyId } : {}),
        },
      });
      // Attach to the class so it becomes class work (teacher-visible) and shows
      // under the class hub's "My work" (my-classes-prd §3.3, reuses placement).
      if (classId) {
        await api(`/projects/${project.id}/placement`, {
          method: 'PATCH',
          body: { action: 'use_for_class', class_id: classId },
        });
      }
      nav(`/learn/projects/${project.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create.');
    }
  };

  return (
    <div>
      <Link to="/learn/projects" className="btn-pill-ghost mb-4 -ml-3">← Projects</Link>

      {classId && (
        <div
          data-testid="making-for-class"
          className="mb-4 rounded-2xl bg-wash-sunshine px-4 py-3 text-[13px] font-semibold text-ink"
        >
          👩‍🏫 Making this for your class — your teacher will be able to see it.
        </div>
      )}

      <div className="mb-8">
        <div className={`eyebrow ${color === 'sky' ? 'eyebrow-sky' : ''}`}>
          {state.mission_slug ? 'Start mission' : 'Free play'}
        </div>
        <h1 className="hero-display">
          What are you <span className="squiggle-word">making</span>?
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="card-base space-y-6"
        style={{ maxWidth: '560px' }}
      >
        <label className="block">
          <span className="label-k12">Give it a name</span>
          <input
            className="input-k12"
            placeholder="My amazing story"
            autoFocus
            {...register('title')}
          />
          {errors.title && <span className="field-error">{errors.title.message}</span>}
        </label>

        <div>
          <span className="label-k12">What kind?</span>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <label className={`pack-card coral text-center cursor-pointer ${productLine === 'line_a_creative' ? 'ring-4 ring-ink ring-offset-2 ring-offset-canvas' : ''}`} style={{ minHeight: 'auto', padding: '24px' }}>
              <input type="radio" value="line_a_creative" className="sr-only" {...register('product_line')} />
              <div className="relative">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">Creative</div>
                <div className="mt-2 text-[18px] font-bold">Art · stories · music</div>
              </div>
            </label>
            <label className={`pack-card sky text-center cursor-pointer ${productLine === 'line_b_coding' ? 'ring-4 ring-ink ring-offset-2 ring-offset-canvas' : ''}`} style={{ minHeight: 'auto', padding: '24px' }}>
              <input type="radio" value="line_b_coding" className="sr-only" {...register('product_line')} />
              <div className="relative">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-85">Coding</div>
                <div className="mt-2 text-[18px] font-bold">Code · build · automate</div>
              </div>
            </label>
          </div>
        </div>

        {state.mission_id && (
          <div className="rounded-2xl bg-wash-mint border border-brand-mint/30 px-4 py-3 text-[13px] font-medium text-ink">
            Linked to mission <span className="font-mono">{state.mission_slug}</span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[13px] font-medium text-ink">
            {error}
          </div>
        )}

        <button type="submit" disabled={isSubmitting} className="btn-pill-primary w-full">
          {isSubmitting ? 'Creating…' : 'Make it! →'}
        </button>
      </form>
    </div>
  );
}
