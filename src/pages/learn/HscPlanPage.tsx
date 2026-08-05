import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';

import { getMyHscPlan } from '@/pages/hsc/hscApi';

export function HscPlanPage() {
  const plan = useQuery({ queryKey: ['hsc-me-plan'], queryFn: getMyHscPlan });

  if (plan.isLoading) return <p className="lead-text">Loading your HSC plan…</p>;
  if (plan.isError) {
    return (
      <div className="card-base max-w-2xl">
        <span className="sticker-coral">Could not load</span>
        <p className="lead-text mt-4">Ask your parent to check the plan, then try again.</p>
      </div>
    );
  }
  if (!plan.data) {
    return (
      <div className="card-base max-w-2xl text-center" data-testid="hsc-kid-empty">
        <span className="sticker-sunshine">No HSC plan yet</span>
        <h1 className="section-heading mt-5">Your family can set this up with you</h1>
        <p className="lead-text mt-3">A parent adds your subjects and real assessment dates from the Parent Portal.</p>
        <Link className="btn-pill-secondary mt-6" to="/learn">Back home</Link>
      </div>
    );
  }

  const upcoming = plan.data.subjects
    .flatMap((subject) => subject.tasks.map((task) => ({ subject: subject.display_name, task })))
    .filter(({ task }) => task.status === 'planned' && task.due_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.task.due_date.localeCompare(b.task.due_date))[0];

  return (
    <div data-testid="hsc-kid-plan">
      <div className="mb-8 max-w-3xl">
        <div className="eyebrow eyebrow-bubblegum">My HSC plan</div>
        <h1 className="hero-display">One clear next step.</h1>
        <p className="lead-text mt-3">These are the dates and results your family saved. They do not predict your HSC mark, Band or ATAR.</p>
        {/*
          §6.2 HSC-DATA-04 — the kid can see everything stored about them but the
          parent owns the record. Saying so plainly matters: without it a student
          is left assuming their marks can never be removed.
        */}
        <p className="mt-2 text-sm font-semibold text-slate2" data-testid="hsc-kid-deletion-notice">
          A parent can change or delete anything on this page from the Parent Portal. Ask them if
          you want something removed.
        </p>
      </div>

      <section className="rounded-3xl bg-wash-sunshine p-6 shadow-card-soft sm:p-8">
        <span className="sticker-sunshine">Next assessment</span>
        {upcoming ? (
          <div className="mt-5">
            <p className="text-sm font-bold uppercase tracking-widest text-slate2">{upcoming.subject}</p>
            <h2 className="mt-2 text-3xl font-extrabold text-ink">{upcoming.task.label}</h2>
            <p className="mt-3 text-lg font-semibold text-ink">Due {upcoming.task.due_date} · worth {upcoming.task.weight}%</p>
            <p className="mt-3 text-sm text-ink-soft">Your weekly action plan will appear here in a later release. For now, use this as the family-confirmed deadline.</p>
          </div>
        ) : (
          <p className="lead-text mt-5">No future assessment has been confirmed yet.</p>
        )}
      </section>

      <section className="mt-8 grid gap-5 sm:grid-cols-2">
        {plan.data.subjects.map((subject) => (
          <article key={subject.id} className="card-base">
            <div className="eyebrow eyebrow-sky">{subject.units} unit{subject.units === 1 ? '' : 's'}</div>
            <h2 className="section-heading mt-2" style={{ fontSize: '25px' }}>{subject.display_name}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="Completed weight" value={`${subject.progress.completed_weight}%`} />
              <Metric label="Still available" value={`${subject.progress.remaining_weight}%`} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate2">
              Running result on completed work:{' '}
              {subject.progress.running_result_over_completed_work === null
                ? 'not available yet'
                : `${subject.progress.running_result_over_completed_work.toFixed(2)}%`}
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-wash-sky p-3"><p className="text-xs font-bold text-slate2">{label}</p><p className="mt-1 text-xl font-extrabold text-ink">{value}</p></div>;
}
