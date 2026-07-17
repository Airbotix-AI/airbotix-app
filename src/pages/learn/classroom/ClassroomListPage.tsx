import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';

import { useMe } from '@/auth/useAuth';
import { SHOW_LESSONS_CATALOG } from '@/lib/features';
import { ClassCoverImage } from './ClassCoverImage';
import { listMyClasses, type ClassMineSummary } from './classroomApi';
import { coverColor, coverEmoji } from './classCover';

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

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow eyebrow-bubblegum">My learning</div>
        <h1 className="hero-display">
          My <span className="squiggle-word">Classes</span>
        </h1>
        <p className="lead-text mt-2">The classes you’re in.</p>
      </div>

      {classes.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : all.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {active.map((c) => (
              <ClassCard key={c.id} klass={c} />
            ))}
          </div>

          {finished.length > 0 && (
            <>
              <h3 className="section-heading mt-10 mb-3" style={{ fontSize: '22px' }}>
                Finished
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {finished.map((c) => (
                  <ClassCard key={c.id} klass={c} />
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-bubblegum">No class yet</span>
          <h2 className="section-heading mt-5" style={{ fontSize: '22px' }}>
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

function nextSessionLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ClassCard({ klass: c }: { klass: ClassMineSummary }) {
  const done = c.status === 'completed';
  const color = coverColor(c.id);
  const emoji = coverEmoji(c.id);
  const pct = c.lessons_total > 0 ? Math.round((c.lessons_done / c.lessons_total) * 100) : 0;
  const next = nextSessionLabel(c.next_session_at);

  return (
    <Link
      to={`/learn/classroom/${c.id}`}
      className="block overflow-hidden rounded-3xl bg-canvas-pure shadow-card-soft transition-transform hover:-translate-y-1"
      data-testid="class-card"
    >
      <ClassCoverImage
        src={c.cover_image_url}
        emoji={emoji}
        color={color}
        done={done}
        className="relative flex h-28 items-center justify-center text-[48px]"
      />

      <div className="p-5">
        <div className="flex items-center justify-between">
          {done ? (
            <span className="sticker-mint" style={{ fontSize: '10px' }}>
              ✓ Completed
            </span>
          ) : c.is_live ? (
            <span className="sticker-coral" style={{ fontSize: '10px' }}>
              ● LIVE NOW
            </span>
          ) : next ? (
            <span className="inline-flex rounded-full bg-wash-sunshine px-3 py-1 text-[11px] font-bold text-ink">
              ▸ Next: {next}
            </span>
          ) : (
            <span />
          )}
          <span className="text-[12px] font-bold text-slate2">
            {c.lessons_done} / {c.lessons_total} lessons
          </span>
        </div>

        <h2 className="mt-2 text-[20px] font-bold leading-tight text-ink">{c.name}</h2>
        {c.course_title && <div className="text-[13px] text-slate2">{c.course_title}</div>}

        <div className="mt-3 flex items-center gap-2">
          <Avatar name={c.teacher_name} url={c.teacher_avatar_url} />
          <span className="text-[13px] font-semibold text-ink">
            {c.teacher_name ?? 'Your teacher'}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-slate2">
            <Users size={14} /> {c.classmate_count}
          </span>
        </div>

        {!done && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-soft">
            <div className="h-full rounded-full bg-grad-mint" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          {done ? (
            <span className="inline-flex rounded-full bg-wash-mint px-3 py-1 text-[12px] font-bold text-ink">
              ⭐ You earned {c.stars_earned} stars
            </span>
          ) : (
            <span />
          )}
          <span className="text-[14px] font-semibold text-brand-coral">
            {done ? 'Revisit →' : 'Enter →'}
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
