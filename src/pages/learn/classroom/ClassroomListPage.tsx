import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import { listClasses, type ClassSummary } from './classroomApi';

/** My classes — `/learn/classroom` (learn-classroom-prd.md §4.1). */
export function ClassroomListPage() {
  const me = useMe();
  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;

  const classes = useQuery<ClassSummary[]>({
    queryKey: ['kid', kidId, 'classes'],
    queryFn: () => listClasses(kidId!),
    enabled: !!kidId,
  });

  return (
    <div>
      <div className="mb-8">
        <div className="eyebrow eyebrow-sunshine">Class wall</div>
        <h1 className="hero-display">
          See what your <span className="squiggle-word">friends</span> made.
        </h1>
        <p className="lead-text mt-4">Browse work shared with your class. Like it. Get inspired.</p>
      </div>

      {classes.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : classes.data && classes.data.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {classes.data.map((c) => (
            <Link key={c.id} to={`/learn/classroom/${c.id}`} className="card-base block hover:-translate-y-0.5 transition-transform">
              <div className="flex items-center gap-2">
                <span className="text-[24px]">🏫</span>
                {c.is_live && <span className="sticker-coral text-[10px]">Live now</span>}
              </div>
              <h2 className="mt-2 text-[20px] font-bold text-ink leading-tight">
                {c.name}
                {c.term ? <span className="text-ink-soft font-semibold"> · {c.term}</span> : null}
              </h2>
              <p className="text-[13px] text-slate2 mt-1">
                {c.teacher_name ? `Teacher: ${c.teacher_name}` : 'Your class'}
                {c.classmate_count != null ? ` · ${c.classmate_count} classmates` : ''}
              </p>
              <div className="mt-5 inline-flex rounded-full bg-wash-sky px-4 py-1.5 text-[12px] font-bold text-ink">
                Open class wall →
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-bubblegum">No class yet</span>
          <h2 className="section-heading mt-5" style={{ fontSize: '22px' }}>
            Ask your parent or teacher to join a class
          </h2>
          <p className="lead-text mt-3 mx-auto" style={{ maxWidth: '460px' }}>
            Once you’re in a class, the work your friends share will show up here.
          </p>
          <div className="mt-7 flex gap-3 justify-center flex-wrap">
            <Link to="/learn/missions" className="btn-pill-primary">Browse missions →</Link>
            <Link to="/learn/create/code" className="btn-pill-secondary">Make something</Link>
          </div>
        </div>
      )}
    </div>
  );
}
