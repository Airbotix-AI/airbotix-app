import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
      <section className="card-base p-6">
        <h2 className="text-xl font-extrabold text-ink">Workshop evidence</h2>
        <p className="mt-2 text-sm text-ink-soft">
          There is no open evidence window right now. Your teacher will tell you when a Workshop is
          ready.
        </p>
      </section>
    );
  }

  const definitions = [selectedPlan?.primary_definition, selectedPlan?.secondary_definition].filter(
    (item): item is NonNullable<typeof item> => !!item,
  );

  return (
    <section className="card-base p-6 sm:p-8" aria-labelledby="submit-evidence-heading">
      <h2 id="submit-evidence-heading" className="section-heading">
        Add Workshop evidence
      </h2>
      <p className="lead-text mt-2">
        Pick the real project you made and explain one decision in your own words. Your teacher
        checks the evidence before a stamp is verified.
      </p>
      <form className="mt-6 grid gap-5" onSubmit={form.handleSubmit(onSubmit)}>
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
        <label className="grid gap-2 text-sm font-bold text-ink">
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
        <label className="grid gap-2 text-sm font-bold text-ink">
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
          <p className="rounded-2xl bg-wash-mint p-3 text-sm font-bold text-ink">
            Evidence sent to your teacher.
          </p>
        )}
        {error && <p className="rounded-2xl bg-wash-coral p-3 text-sm text-ink">{error}</p>}
        <button type="submit" className="btn-pill-primary justify-self-start" disabled={busy}>
          {busy ? 'Sending…' : 'Send evidence for review'}
        </button>
      </form>
    </section>
  );
}
