import { ArrowRight, CheckCircle2, Radio, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ClassCoverImage } from './ClassCoverImage';
import { coverColor, coverEmoji } from './classCover';
import type { ClassMineSummary } from './classroomApi';

function nextSessionLabel(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ClassCard({ klass: currentClass }: { klass: ClassMineSummary }) {
  const done = currentClass.status === 'completed';
  const color = coverColor(currentClass.id);
  const emoji = coverEmoji(currentClass.id);
  const progress =
    currentClass.lessons_total > 0
      ? Math.round((currentClass.lessons_done / currentClass.lessons_total) * 100)
      : 0;
  const next = nextSessionLabel(currentClass.next_session_at);

  return (
    <Link
      to={`/learn/classroom/${currentClass.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-[32px] border border-hairline bg-canvas-pure shadow-card-soft outline-none transition-all duration-200 hover:-translate-y-1 hover:border-brand-sky/40 hover:shadow-brand-sky focus-visible:ring-4 focus-visible:ring-brand-sky/30"
      data-testid="class-card"
    >
      <ClassCoverImage
        src={currentClass.cover_image_url}
        emoji={emoji}
        color={color}
        done={done}
        className="relative flex h-36 items-center justify-center text-[54px] sm:h-40"
      >
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
          {done ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-canvas-pure/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-ink shadow-card-soft backdrop-blur">
              <CheckCircle2 aria-hidden="true" size={14} className="text-brand-mint" />
              Completed
            </span>
          ) : currentClass.is_live ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-coral px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white shadow-card-soft">
              <Radio aria-hidden="true" size={14} />
              Live now
            </span>
          ) : next ? (
            <span className="rounded-full bg-canvas-pure/90 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink shadow-card-soft backdrop-blur">
              Next · {next}
            </span>
          ) : (
            <span />
          )}
          <span className="rounded-full bg-ink/75 px-3 py-1.5 text-[10px] font-bold text-white backdrop-blur">
            {currentClass.lessons_done} / {currentClass.lessons_total} lessons
          </span>
        </div>
      </ClassCoverImage>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[21px] font-bold leading-tight text-ink transition-colors group-hover:text-brand-coral">
          {currentClass.name}
        </h3>
        {currentClass.course_title && (
          <div className="mt-1 text-[13px] font-medium text-slate2">
            {currentClass.course_title}
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface px-3.5 py-3">
          <Avatar name={currentClass.teacher_name} url={currentClass.teacher_avatar_url} />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate2">
              Teacher
            </div>
            <div className="text-[13px] font-semibold text-ink">
              {currentClass.teacher_name ?? 'Your teacher'}
            </div>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-slate2">
            <Users aria-hidden="true" size={15} /> {currentClass.classmate_count}
          </span>
        </div>

        {!done && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-slate2">
              <span>Your progress</span>
              <span>{progress}%</span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-surface-soft"
              role="progressbar"
              aria-label={`${currentClass.lessons_done} of ${currentClass.lessons_total} lessons complete`}
              aria-valuemin={0}
              aria-valuemax={currentClass.lessons_total}
              aria-valuenow={currentClass.lessons_done}
            >
              <div
                className="h-full rounded-full bg-grad-mint"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          {done ? (
            <span className="inline-flex rounded-full bg-wash-mint px-3 py-1.5 text-[12px] font-bold text-ink">
              ⭐ You earned {currentClass.stars_earned} stars
            </span>
          ) : (
            <span className="hidden text-[12px] font-semibold text-slate2 sm:inline">
              Keep going — you’ve got this!
            </span>
          )}
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-bold text-white transition-colors group-hover:bg-brand-coral">
            {done ? 'Revisit' : 'Enter'}
            <ArrowRight aria-hidden="true" size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
}

function Avatar({ name, url }: { name: string | null; url: string | null }) {
  if (url) {
    return <img src={url} alt="" className="h-7 w-7 rounded-full object-cover" />;
  }
  const initial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-grad-sky text-[12px] font-bold text-white">
      {initial}
    </span>
  );
}
