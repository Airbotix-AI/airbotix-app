import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { BookOpen, CheckCircle2, GraduationCap, Sparkles } from 'lucide-react';

import { useMe } from '@/auth/useAuth';
import { SHOW_LESSONS_CATALOG } from '@/lib/features';
import { listMyClasses, type ClassMineSummary } from './classroomApi';
import { ClassCard } from './ClassroomListCard';

/** My Classes — `/learn/classroom` (my-classes-prd §2 + §4). */
export function ClassroomListPage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const classes = useQuery<ClassMineSummary[]>({
    queryKey: ['kid', kidId, 'classes'],
    queryFn: () => listMyClasses(),
    enabled: !!kidId,
  });

  const all = classes.data ?? [];
  const active = all.filter((c) => c.status === 'active');
  const finished = all.filter((c) => c.status === 'completed');
  const lessonsDone = all.reduce((total, c) => total + c.lessons_done, 0);
  const lessonsTotal = all.reduce((total, c) => total + c.lessons_total, 0);

  return (
    <div className="relative isolate">
      <section
        className="relative mb-10 overflow-hidden rounded-[32px] border border-brand-sky/20 bg-gradient-to-br from-wash-sky via-canvas-pure to-wash-mint px-6 py-8 shadow-card-soft sm:px-9 sm:py-10 lg:px-12"
        data-testid="classroom-hero"
      >
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-brand-sky/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-mint/15 blur-3xl" />

        <div className="relative grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <div className="eyebrow eyebrow-bubblegum">My learning</div>
            <h1 className="hero-display">
              My <span className="squiggle-word">Classes</span>
            </h1>
            <p className="lead-text mt-4 max-w-2xl">
              Your lessons, teachers, and progress — all together in one happy place.
            </p>
          </div>

          {classes.isLoading ? (
            <div className="inline-flex items-center gap-3 rounded-2xl bg-canvas-pure/80 px-5 py-4 text-[14px] font-semibold text-slate2 shadow-card-soft backdrop-blur">
              <Sparkles aria-hidden="true" className="text-brand-bubblegum" size={20} />
              Finding your classes…
            </div>
          ) : all.length > 0 ? (
            <div className="grid grid-cols-2 gap-3" aria-label="Learning overview">
              <OverviewStat
                icon={<GraduationCap aria-hidden="true" size={20} />}
                value={String(active.length)}
                label={active.length === 1 ? 'Active class' : 'Active classes'}
                color="sky"
              />
              <OverviewStat
                icon={<CheckCircle2 aria-hidden="true" size={20} />}
                value={`${lessonsDone}/${lessonsTotal}`}
                label="Lessons finished"
                color="mint"
              />
            </div>
          ) : (
            <div className="inline-flex items-center gap-3 rounded-2xl bg-canvas-pure/80 px-5 py-4 text-[14px] font-semibold text-slate2 shadow-card-soft backdrop-blur">
              <BookOpen aria-hidden="true" className="text-brand-sky" size={20} />
              Your class space is ready
            </div>
          )}
        </div>
      </section>

      {classes.isLoading ? (
        <div
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Loading classes"
        >
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-[360px] animate-pulse rounded-[32px] border border-hairline bg-canvas-pure shadow-card-soft motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : all.length > 0 ? (
        <div className="space-y-12">
          {active.length > 0 && (
            <section aria-labelledby="active-classes-heading">
              <SectionHeading
                id="active-classes-heading"
                title="Ready for your next lesson"
                label={`${active.length} active`}
                description="Jump back in and keep your learning streak moving."
              />
              <div
                className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                data-testid="active-classes-grid"
              >
                {active.map((c) => (
                  <ClassCard key={c.id} klass={c} />
                ))}
              </div>
            </section>
          )}

          {finished.length > 0 && (
            <section aria-labelledby="finished-classes-heading">
              <SectionHeading
                id="finished-classes-heading"
                title="Finished adventures"
                label={`${finished.length} complete`}
                description="Revisit your work and celebrate how far you’ve come."
              />
              <div
                className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
                data-testid="finished-classes-grid"
              >
                {finished.map((c) => (
                  <ClassCard key={c.id} klass={c} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-[32px] border border-hairline bg-canvas-pure px-6 py-12 text-center shadow-card-soft sm:px-10">
          <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-[28px] bg-wash-sky text-brand-sky">
            <BookOpen aria-hidden="true" size={38} strokeWidth={1.8} />
          </div>
          <span className="sticker-bubblegum">No class yet</span>
          <h2 className="section-heading mt-6" style={{ fontSize: '28px' }}>
            Ask your parent or teacher to join a class
          </h2>
          <p className="lead-text mt-3 mx-auto" style={{ maxWidth: '460px' }}>
            Once you’re in a class, your lessons, schedule, and the work your friends share will
            show up here.
          </p>
          <div className="mt-7 flex gap-3 justify-center flex-wrap">
            {SHOW_LESSONS_CATALOG && (
              <Link to="/learn/missions" className="btn-pill-primary">
                Browse lessons →
              </Link>
            )}
            <Link
              to="/learn/create"
              className={SHOW_LESSONS_CATALOG ? 'btn-pill-secondary' : 'btn-pill-primary'}
            >
              Make something
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewStat({
  icon,
  value,
  label,
  color,
}: {
  icon: ReactNode;
  value: string;
  label: string;
  color: 'sky' | 'mint';
}) {
  const styles = color === 'sky' ? 'bg-wash-sky text-brand-sky' : 'bg-wash-mint text-brand-mint';

  return (
    <div className="min-w-[138px] rounded-3xl border border-white/80 bg-canvas-pure/85 p-4 shadow-card-soft backdrop-blur sm:min-w-[160px]">
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${styles}`}>{icon}</div>
      <div className="text-[24px] font-extrabold leading-none text-ink">{value}</div>
      <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate2">
        {label}
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  label,
  description,
}: {
  id: string;
  title: string;
  label: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div>
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] text-brand-coral">
          <span className="h-2 w-2 rounded-full bg-brand-coral" />
          {label}
        </div>
        <h2 id={id} className="text-[26px] font-bold leading-tight text-ink sm:text-[30px]">
          {title}
        </h2>
      </div>
      <p className="max-w-md text-[14px] font-medium leading-relaxed text-slate2 sm:text-right">
        {description}
      </p>
    </div>
  );
}
