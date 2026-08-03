import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useFieldArray, useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';

import { useMe } from '@/auth/useAuth';
import { ApiError, api } from '@/lib/api';
import {
  addHscSubject,
  addHscTask,
  createHscPlan,
  importHscClaim,
  listHscCourses,
  listHscPlans,
  previewHscClaim,
  type HscClaimPreview,
  type HscCourse,
  type HscPlan,
  type HscSubject,
} from '@/pages/hsc/hscApi';

interface Kid {
  id: string;
  nickname: string;
  age: number;
  is_active: boolean;
}

const currentSchoolYear = new Date().getFullYear();

const planSchema = z.object({
  kid_id: z.string().min(1, 'Choose a child'),
  school_year: z.coerce.number().int().min(2020).max(2100),
});
type PlanValues = z.infer<typeof planSchema>;

const subjectSchema = z
  .object({
    course_key: z.string().min(1, 'Choose a course'),
    display_name: z.string().trim().optional(),
  })
  .refine((value) => value.course_key !== 'other' || Boolean(value.display_name), {
    path: ['display_name'],
    message: 'Enter the course name used by the school',
  });
type SubjectValues = z.infer<typeof subjectSchema>;

const taskSchema = z
  .object({
    label: z.string().trim().min(1, 'Enter the task name'),
    due_date: z.string().date(),
    // z.coerce.number() reads '' as 0, so a blank field must be matched by the
    // empty branch FIRST. With the number branch first, an upcoming assessment
    // sent achieved_mark: 0 while maximum_mark stayed '' (0 fails .positive()),
    // and the API rejected every planned task with "Achieved and maximum marks
    // must be entered together". Blank weight silently saved a 0% assessment.
    weight: z.preprocess(
      (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
      z.coerce.number({ invalid_type_error: 'Enter the weight' }).min(0).max(100),
    ),
    status: z.enum(['planned', 'completed']),
    achieved_mark: z.union([z.literal(''), z.coerce.number().min(0)]).optional(),
    maximum_mark: z.union([z.literal(''), z.coerce.number().positive()]).optional(),
  })
  .refine(
    (value) =>
      value.status === 'planned' ||
      (typeof value.achieved_mark === 'number' && typeof value.maximum_mark === 'number'),
    { path: ['achieved_mark'], message: 'Completed tasks need both marks' },
  );
type TaskValues = z.infer<typeof taskSchema>;

const claimSchema = z
  .object({
    kid_id: z.string().min(1, 'Choose a child'),
    school_year: z.coerce.number().int().min(2020).max(2100),
    course_key: z.string().min(1, 'Choose a course'),
    display_name: z.string().trim().optional(),
    tasks: z.array(
      z.object({
        claim_task_id: z.string(),
        label: z.string().trim().min(1, 'Name this assessment'),
        due_date: z.string().date(),
      }),
    ),
  })
  .refine((value) => value.course_key !== 'other' || Boolean(value.display_name), {
    path: ['display_name'],
    message: 'Enter the course name used by the school',
  });
type ClaimValues = z.infer<typeof claimSchema>;

export function HscPlannerPage() {
  const me = useMe();
  const familyId = me.data?.kind === 'user' ? me.data.family_id : null;
  const [searchParams] = useSearchParams();
  const claimToken = searchParams.get('claim');
  const kids = useQuery<Kid[]>({
    queryKey: ['family', familyId, 'kids'],
    queryFn: () => api<Kid[]>(`/families/${familyId}/kids`),
    enabled: Boolean(familyId),
  });
  const plans = useQuery({
    queryKey: ['hsc-plans', familyId],
    queryFn: () => listHscPlans(familyId!),
    enabled: Boolean(familyId),
  });
  const courses = useQuery({ queryKey: ['hsc-courses'], queryFn: listHscCourses });
  const preview = useQuery({
    queryKey: ['hsc-claim-preview', familyId, claimToken],
    queryFn: () => previewHscClaim(familyId!, claimToken!),
    enabled: Boolean(familyId && claimToken),
    retry: false,
  });

  if (!familyId) {
    return (
      <div className="card-base max-w-2xl">
        <span className="sticker-sunshine">Family setup needed</span>
        <h1 className="section-heading mt-5">Create your family before saving an HSC plan</h1>
        <Link className="btn-pill-primary mt-6" to="/portal/register">Set up my family →</Link>
      </div>
    );
  }

  return (
    <div data-testid="hsc-parent-planner">
      <div className="mb-8 max-w-3xl">
        <div className="eyebrow eyebrow-sky">HSC family planner</div>
        <h1 className="hero-display">Keep the facts together. Plan the next assessment.</h1>
        <p className="lead-text mt-4">
          Save school assessment details for one child at a time. Running results are school
          progress only—not a predicted HSC mark, Band or ATAR.
        </p>
      </div>

      {claimToken && (
        <ClaimImportPanel
          claimToken={claimToken}
          courses={courses.data?.courses ?? []}
          familyId={familyId}
          kids={kids.data ?? []}
          preview={preview.data}
          previewError={preview.isError}
        />
      )}

      <CreatePlanPanel familyId={familyId} kids={kids.data ?? []} />

      {plans.isLoading && <p className="lead-text mt-8">Loading HSC plans…</p>}
      {plans.isError && <ErrorMessage error={plans.error} fallback="We could not load the family HSC plans." />}
      <div className="mt-8 space-y-8">
        {(plans.data ?? []).map((plan) => (
          <PlanPanel
            key={plan.id}
            courses={courses.data?.courses ?? []}
            familyId={familyId}
            plan={plan}
          />
        ))}
      </div>
    </div>
  );
}

function ClaimImportPanel({
  claimToken,
  courses,
  familyId,
  kids,
  preview,
  previewError,
}: {
  claimToken: string;
  courses: HscCourse[];
  familyId: string;
  kids: Kid[];
  preview?: HscClaimPreview;
  previewError: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<ClaimValues>({
    resolver: zodResolver(claimSchema),
    defaultValues: { school_year: currentSchoolYear, tasks: [] },
  });
  const fields = useFieldArray({ control: form.control, name: 'tasks' });

  useEffect(() => {
    if (!preview) return;
    form.reset({
      kid_id: '',
      school_year: currentSchoolYear,
      course_key: '',
      display_name: '',
      tasks: preview.tasks.map((task, index) => ({
        claim_task_id: task.id,
        label: `Assessment ${index + 1}`,
        due_date: new Date().toISOString().slice(0, 10),
      })),
    });
  }, [form, preview]);

  const mutation = useMutation({
    mutationFn: ({ display_name, ...values }: ClaimValues) =>
      // A governed course carries its own catalogue name; only the explicit
      // "other" fallback sends one. The form default is '', which is NOT the
      // same as absent to the API — send it only when the parent typed it.
      importHscClaim(familyId, {
        claim_token: claimToken,
        ...values,
        ...(display_name?.trim() ? { display_name: display_name.trim() } : {}),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hsc-plans', familyId] });
      navigate('/portal/academy/hsc-planner', { replace: true });
    },
  });

  return (
    <section className="card-feature mb-8 border-2 border-brand-coral" data-testid="hsc-claim-import">
      <span className="sticker-coral">Finish saving your calculator</span>
      <h2 className="section-heading mt-5" style={{ fontSize: '28px' }}>Confirm what should enter the family plan</h2>
      <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
        Nothing is saved until you choose the child and course, then confirm a real name and date
        for every assessment.
      </p>
      {previewError && <p className="field-error mt-5">This save link is invalid, expired or already used.</p>}
      {!preview && !previewError && <p className="lead-text mt-5">Checking the one-use save link…</p>}
      {preview && (
        <form className="mt-6 space-y-5" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <div className="grid gap-4 md:grid-cols-3">
            <SelectField label="Year 12 child" error={form.formState.errors.kid_id?.message} registration={form.register('kid_id')}>
              <option value="">Choose child</option>
              {kids.filter((kid) => kid.is_active).map((kid) => <option key={kid.id} value={kid.id}>{kid.nickname} · age {kid.age}</option>)}
            </SelectField>
            <InputField label="School year" type="number" error={form.formState.errors.school_year?.message} registration={form.register('school_year')} />
            <SelectField label="Course" error={form.formState.errors.course_key?.message} registration={form.register('course_key')}>
              <option value="">Choose course</option>
              {courses.map((course) => <option key={course.key} value={course.key}>{course.display_name}</option>)}
            </SelectField>
          </div>
          {form.watch('course_key') === 'other' && (
            <InputField label="Course name used by the school" error={form.formState.errors.display_name?.message} registration={form.register('display_name')} />
          )}
          <div className="space-y-3">
            {fields.fields.map((field, index) => {
              const source = preview.tasks[index];
              return (
                <fieldset key={field.id} className="rounded-2xl bg-wash-sky p-4">
                  <legend className="px-2 font-bold text-ink">
                    {source.achieved_mark}/{source.maximum_mark} · weight {source.weight}%
                  </legend>
                  <input type="hidden" {...form.register(`tasks.${index}.claim_task_id`)} />
                  <div className="grid gap-4 md:grid-cols-2">
                    <InputField label="Assessment name" error={form.formState.errors.tasks?.[index]?.label?.message} registration={form.register(`tasks.${index}.label`)} />
                    <InputField label="Assessment date" type="date" error={form.formState.errors.tasks?.[index]?.due_date?.message} registration={form.register(`tasks.${index}.due_date`)} />
                  </div>
                </fieldset>
              );
            })}
          </div>
          {mutation.isError && <ErrorMessage error={mutation.error} fallback="We could not import this calculation." />}
          <button className="btn-pill-primary" disabled={mutation.isPending} type="submit">
            {mutation.isPending ? 'Saving…' : 'Confirm and save to this child'}
          </button>
        </form>
      )}
    </section>
  );
}

function CreatePlanPanel({ familyId, kids }: { familyId: string; kids: Kid[] }) {
  const queryClient = useQueryClient();
  const form = useForm<PlanValues>({
    resolver: zodResolver(planSchema),
    defaultValues: { kid_id: '', school_year: currentSchoolYear },
  });
  const mutation = useMutation({
    mutationFn: (values: PlanValues) => createHscPlan(familyId, values.kid_id, values.school_year),
    onSuccess: async () => {
      form.reset({ kid_id: '', school_year: currentSchoolYear });
      await queryClient.invalidateQueries({ queryKey: ['hsc-plans', familyId] });
    },
  });
  return (
    <section className="card-base">
      <div className="eyebrow eyebrow-mint">Start another plan</div>
      <form className="mt-4 flex flex-wrap items-end gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <SelectField label="Year 12 child" error={form.formState.errors.kid_id?.message} registration={form.register('kid_id')}>
          <option value="">Choose child</option>
          {kids.filter((kid) => kid.is_active).map((kid) => <option key={kid.id} value={kid.id}>{kid.nickname}</option>)}
        </SelectField>
        <InputField label="School year" type="number" error={form.formState.errors.school_year?.message} registration={form.register('school_year')} />
        <button className="btn-pill-secondary" disabled={mutation.isPending} type="submit">Create plan</button>
      </form>
      {mutation.isError && <ErrorMessage error={mutation.error} fallback="We could not create that plan." />}
    </section>
  );
}

function PlanPanel({ courses, familyId, plan }: { courses: HscCourse[]; familyId: string; plan: HscPlan }) {
  return (
    <section className="rounded-3xl border-2 border-ink bg-canvas-pure p-5 shadow-sticker sm:p-7" data-testid={`hsc-plan-${plan.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-bubblegum">{plan.school_year} HSC plan</div>
          <h2 className="section-heading mt-2">{plan.kid.nickname}</h2>
        </div>
        <span className={plan.activation_status === 'active' ? 'sticker-mint' : 'sticker-sunshine'}>
          {plan.activation_status === 'active' ? 'Plan active' : 'Setup in progress'}
        </span>
      </div>
      {plan.activation_status === 'setup_required' && (
        <p className="mt-4 rounded-2xl bg-wash-sunshine p-4 text-sm font-semibold text-ink">
          Activation needs at least two subjects and one confirmed future assessment.
        </p>
      )}
      <div className="mt-6 space-y-5">
        {plan.subjects.map((subject) => <SubjectPanel key={subject.id} familyId={familyId} subject={subject} />)}
      </div>
      <AddSubjectForm courses={courses} familyId={familyId} planId={plan.id} />
    </section>
  );
}

function SubjectPanel({ familyId, subject }: { familyId: string; subject: HscSubject }) {
  const running = subject.progress.running_result_over_completed_work;
  return (
    <article className="rounded-2xl bg-wash-sky p-4 sm:p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-ink">{subject.display_name}</h3>
          <p className="mt-1 text-sm font-semibold text-slate2">{subject.units} unit{subject.units === 1 ? '' : 's'} · {subject.progress.completed_weight}% completed weight</p>
        </div>
        <strong className="text-2xl text-ink">{running === null ? '—' : `${running.toFixed(2)}%`}</strong>
      </div>
      <p className="mt-2 text-xs font-semibold text-slate2">Running result on completed work only—not a predicted HSC mark.</p>
      <div className="mt-4 grid gap-3">
        {subject.tasks.map((task) => (
          <div key={task.id} className="rounded-xl bg-canvas-pure p-3 text-sm text-ink">
            <strong>{task.label}</strong>
            <span className="mt-1 block text-slate2">{task.due_date} · weight {task.weight}% · {task.status === 'completed' ? `${task.achieved_mark}/${task.maximum_mark}` : 'result not entered'}</span>
          </div>
        ))}
      </div>
      <AddTaskForm familyId={familyId} subjectId={subject.id} />
    </article>
  );
}

function AddSubjectForm({ courses, familyId, planId }: { courses: HscCourse[]; familyId: string; planId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<SubjectValues>({ resolver: zodResolver(subjectSchema), defaultValues: { course_key: '', display_name: '' } });
  const mutation = useMutation({
    // Same rule as the claim import: '' is not an absent display_name.
    mutationFn: ({ display_name, ...values }: SubjectValues) =>
      addHscSubject(familyId, planId, {
        ...values,
        ...(display_name?.trim() ? { display_name: display_name.trim() } : {}),
      }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['hsc-plans', familyId] });
    },
  });
  return (
    <form className="mt-6 rounded-2xl border border-hairline p-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <h3 className="font-bold text-ink">Add a subject</h3>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <SelectField label="Course" error={form.formState.errors.course_key?.message} registration={form.register('course_key')}>
          <option value="">Choose course</option>
          {courses.map((course) => <option key={course.key} value={course.key}>{course.display_name}</option>)}
        </SelectField>
        {form.watch('course_key') === 'other' && <InputField label="School course name" error={form.formState.errors.display_name?.message} registration={form.register('display_name')} />}
        <button className="btn-pill-secondary" disabled={mutation.isPending} type="submit">Add subject</button>
      </div>
      {mutation.isError && <ErrorMessage error={mutation.error} fallback="We could not add that subject." />}
    </form>
  );
}

function AddTaskForm({ familyId, subjectId }: { familyId: string; subjectId: string }) {
  const queryClient = useQueryClient();
  const form = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { label: '', due_date: '', weight: 0, status: 'planned', achieved_mark: '', maximum_mark: '' },
  });
  const mutation = useMutation({
    mutationFn: (values: TaskValues) =>
      addHscTask(familyId, subjectId, {
        label: values.label,
        due_date: values.due_date,
        weight: values.weight,
        status: values.status,
        ...(typeof values.achieved_mark === 'number' ? { achieved_mark: values.achieved_mark } : {}),
        ...(typeof values.maximum_mark === 'number' ? { maximum_mark: values.maximum_mark } : {}),
      }),
    onSuccess: async () => {
      form.reset();
      await queryClient.invalidateQueries({ queryKey: ['hsc-plans', familyId] });
    },
  });
  const completed = form.watch('status') === 'completed';
  return (
    <form className="mt-4 rounded-xl bg-canvas-pure p-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
      <h4 className="font-bold text-ink">Add an assessment</h4>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <InputField label="Task name" error={form.formState.errors.label?.message} registration={form.register('label')} />
        <InputField label="Date" type="date" error={form.formState.errors.due_date?.message} registration={form.register('due_date')} />
        <InputField label="Weight %" type="number" error={form.formState.errors.weight?.message} registration={form.register('weight')} />
        <SelectField label="Status" error={form.formState.errors.status?.message} registration={form.register('status')}>
          <option value="planned">Upcoming</option>
          <option value="completed">Completed</option>
        </SelectField>
        {completed && (
          <>
            <InputField label="Mark achieved" type="number" error={form.formState.errors.achieved_mark?.message} registration={form.register('achieved_mark')} />
            <InputField label="Maximum mark" type="number" error={form.formState.errors.maximum_mark?.message} registration={form.register('maximum_mark')} />
          </>
        )}
      </div>
      {mutation.isError && <ErrorMessage error={mutation.error} fallback="We could not add that assessment." />}
      <button className="btn-pill-primary mt-4" disabled={mutation.isPending} type="submit">Save assessment</button>
    </form>
  );
}

function InputField({ label, type = 'text', error, registration }: { label: string; type?: string; error?: string; registration: UseFormRegisterReturn }) {
  return <label className="block min-w-44 text-sm font-bold text-ink">{label}<input className="input-k12 mt-1" type={type} step={type === 'number' ? '0.01' : undefined} {...registration} />{error && <span className="field-error">{error}</span>}</label>;
}

function SelectField({ label, error, registration, children }: { label: string; error?: string; registration: UseFormRegisterReturn; children: React.ReactNode }) {
  return <label className="block min-w-52 text-sm font-bold text-ink">{label}<select className="input-k12 mt-1" {...registration}>{children}</select>{error && <span className="field-error">{error}</span>}</label>;
}

function ErrorMessage({ error, fallback }: { error: unknown; fallback: string }) {
  return <p className="field-error mt-3" role="alert">{error instanceof ApiError ? error.message : fallback}</p>;
}
