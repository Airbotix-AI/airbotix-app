import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useMe } from '@/auth/useAuth';
import { CreatorPassportView } from '@/features/creator-passport/CreatorPassportView';
import {
  fetchCreatorPassport,
  fetchWorkshopStampPlans,
  type WorkshopStampPlan,
} from '@/features/creator-passport/creatorPassport';
import { api } from '@/lib/api';
import { listMyClasses, type ClassMineSummary } from './classroom/classroomApi';
import type { KidProject } from './projects/kidProject';

const EvidenceFormSchema = z.object({
  plan_id: z.string().min(1, 'Choose a Workshop.'),
  definition_id: z.string().min(1, 'Choose a capability.'),
  project_id: z.string().min(1, 'Choose a Workshop project.'),
  reflection: z.string().trim().min(5, 'Tell us a little more.').max(1000),
});

type EvidenceForm = z.infer<typeof EvidenceFormSchema>;

export function CreatorPassportPage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const queryClient = useQueryClient();
  const passport = useQuery({
    queryKey: ['creator-passport', kidId],
    queryFn: () => fetchCreatorPassport(kidId as string),
    enabled: !!kidId,
  });
  const classes = useQuery<ClassMineSummary[]>({
    queryKey: ['kid', kidId, 'classes'],
    queryFn: listMyClasses,
    enabled: !!kidId,
  });
  const projects = useQuery<KidProject[]>({
    queryKey: ['projects', 'kid', kidId],
    queryFn: () => api<KidProject[]>(`/kids/${kidId}/projects`),
    enabled: !!kidId,
  });
  const planQueries = useQueries({
    queries: (classes.data ?? []).map((classItem) => ({
      queryKey: ['creator-passport', 'plans', classItem.id],
      queryFn: () => fetchWorkshopStampPlans(classItem.id),
      enabled: !!kidId,
    })),
  });
  const plans = useMemo(
    () =>
      planQueries
        .flatMap((query) => query.data ?? [])
        .filter((plan) => plan.status === 'published'),
    [planQueries],
  );

  const form = useForm<EvidenceForm>({
    resolver: zodResolver(EvidenceFormSchema),
    defaultValues: { plan_id: '', definition_id: '', project_id: '', reflection: '' },
  });
  const selectedPlan = plans.find((plan) => plan.id === form.watch('plan_id'));
  const selectedDefinition = [
    selectedPlan?.primary_definition,
    selectedPlan?.secondary_definition,
  ].find((definition) => definition?.id === form.watch('definition_id'));
  const planProjects = (projects.data ?? []).filter(
    (project) => project.class_id === selectedPlan?.class_id,
  );

  useEffect(() => {
    if (!form.getValues('plan_id') && plans[0]) {
      form.setValue('plan_id', plans[0].id);
      form.setValue('definition_id', plans[0].primary_definition.id);
    }
  }, [form, plans]);

  const submit = useMutation({
    mutationFn: (values: EvidenceForm) => {
      const plan = plans.find((item) => item.id === values.plan_id);
      const definition = [plan?.primary_definition, plan?.secondary_definition].find(
        (item) => item?.id === values.definition_id,
      );
      if (!plan || !definition) throw new Error('Workshop evidence plan is unavailable.');
      return api('/creator-passport/evidence', {
        method: 'POST',
        body: {
          session_id: plan.session_id,
          project_id: values.project_id,
          definition_id: definition.id,
          evidence_refs: [{ kind: 'project_version', ref_id: values.project_id }],
          child_reflection: { format: 'text', text: values.reflection, entered_by: 'kid' },
          rubric_checks: Object.fromEntries(definition.rubric.map((item) => [item.id, false])),
        },
      });
    },
    onSuccess: () => {
      form.reset({
        plan_id: selectedPlan?.id ?? '',
        definition_id: selectedDefinition?.id ?? '',
        project_id: '',
        reflection: '',
      });
      void queryClient.invalidateQueries({ queryKey: ['creator-passport', kidId] });
    },
  });

  if (passport.isLoading) return <p className="lead-text">Loading your Creator Passport…</p>;
  if (passport.isError || !passport.data) {
    return <p className="lead-text">We could not load your Creator Passport. Please try again.</p>;
  }

  return (
    <div className="space-y-10">
      <CreatorPassportView passport={passport.data} />
      <EvidenceSubmissionPanel
        classes={classes.data ?? []}
        plans={plans}
        planProjects={planProjects}
        selectedPlan={selectedPlan}
        form={form}
        onSubmit={(values) => submit.mutate(values)}
        busy={submit.isPending}
        succeeded={submit.isSuccess}
        error={submit.error instanceof Error ? submit.error.message : null}
      />
    </div>
  );
}

function EvidenceSubmissionPanel({
  classes,
  plans,
  planProjects,
  selectedPlan,
  form,
  onSubmit,
  busy,
  succeeded,
  error,
}: {
  classes: ClassMineSummary[];
  plans: WorkshopStampPlan[];
  planProjects: KidProject[];
  selectedPlan: WorkshopStampPlan | undefined;
  form: ReturnType<typeof useForm<EvidenceForm>>;
  onSubmit: (values: EvidenceForm) => void;
  busy: boolean;
  succeeded: boolean;
  error: string | null;
}) {
  const classNameById = new Map(classes.map((item) => [item.id, item.name]));
  if (plans.length === 0) {
    return (
      <section className="rounded-[28px] border-2 border-dashed border-brand-sky bg-wash-sky p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-canvas-pure text-brand-sky shadow-sm">
            <Clock3 size={23} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand-sky">
              Workshop evidence
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-ink">Nothing to send right now</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
              Your teacher opens an evidence window during a Workshop. When it appears, choose your
              real project and explain one decision in your own words.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-bold text-ink-soft">
              <span className="rounded-full bg-canvas-pure px-3 py-1.5">1 · Build something</span>
              <span className="rounded-full bg-canvas-pure px-3 py-1.5">2 · Explain a choice</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas-pure px-3 py-1.5">
                <ShieldCheck size={13} aria-hidden="true" /> 3 · Teacher checks it
              </span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const definitions = [selectedPlan?.primary_definition, selectedPlan?.secondary_definition].filter(
    (item): item is NonNullable<typeof item> => !!item,
  );

  return (
    <section
      className="overflow-hidden rounded-[28px] border-2 border-brand-bubblegum bg-canvas-pure shadow-brand-bubblegum"
      aria-labelledby="submit-evidence-heading"
    >
      <div className="bg-wash-bubblegum px-5 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-bubblegum text-ink">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <div>
            <h2 id="submit-evidence-heading" className="section-heading">
              Add Workshop evidence
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-ink-soft">
              Pick the real project you made and explain one decision in your own words. Your
              teacher checks it before a stamp is verified.
            </p>
          </div>
        </div>
      </div>
      <form className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="grid gap-2 text-sm font-bold text-ink">
          Workshop
          <select
            {...form.register('plan_id')}
            className="input-base"
            onChange={(event) => {
              form.setValue('plan_id', event.target.value);
              const next = plans.find((plan) => plan.id === event.target.value);
              form.setValue('definition_id', next?.primary_definition.id ?? '');
              form.setValue('project_id', '');
            }}
          >
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {classNameById.get(plan.class_id) ?? 'Workshop'} ·{' '}
                {new Date(plan.session.scheduled_starts_at).toLocaleDateString('en-AU')}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-ink">
          Capability
          <select {...form.register('definition_id')} className="input-base">
            {definitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.display_name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-ink sm:col-span-2">
          Project evidence
          <select {...form.register('project_id')} className="input-base">
            <option value="">Choose a project</option>
            {planProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          {form.formState.errors.project_id && (
            <span className="text-xs text-brand-coral">
              {form.formState.errors.project_id.message}
            </span>
          )}
        </label>
        <label className="grid gap-2 text-sm font-bold text-ink sm:col-span-2">
          What did you decide, change or learn?
          <textarea
            {...form.register('reflection')}
            rows={4}
            className="input-base resize-y"
            placeholder="I wanted my project to… Then I changed…"
          />
          {form.formState.errors.reflection && (
            <span className="text-xs text-brand-coral">
              {form.formState.errors.reflection.message}
            </span>
          )}
        </label>
        {succeeded && (
          <p className="rounded-2xl bg-wash-mint p-3 text-sm font-bold text-ink sm:col-span-2">
            Evidence sent to your teacher.
          </p>
        )}
        {error && (
          <p className="rounded-2xl bg-wash-coral p-3 text-sm text-ink sm:col-span-2">{error}</p>
        )}
        <button
          type="submit"
          className="btn-pill-primary justify-self-start sm:col-span-2"
          disabled={busy}
        >
          {busy ? 'Sending…' : 'Send evidence for review'}
        </button>
      </form>
    </section>
  );
}
