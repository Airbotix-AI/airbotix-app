import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useWsEvent } from '@/lib/useWsEvent';
import { getClass, getWall, type ClassSummary, type WallPost } from './classroomApi';
import { WallCard } from './WallCard';

/** A single class wall — `/learn/classroom/:classId` (learn-classroom-prd §4.2). */
export function ClassWallViewPage() {
  const { classId } = useParams<{ classId: string }>();
  const qc = useQueryClient();

  const klass = useQuery<ClassSummary>({
    queryKey: ['class', classId],
    queryFn: () => getClass(classId!),
    enabled: !!classId,
  });

  const wall = useQuery<WallPost[]>({
    queryKey: ['class', classId, 'wall'],
    queryFn: () => getWall(classId!),
    enabled: !!classId,
  });

  // Live wall updates (learn-classroom-prd §9): share granted/revoked + like toggles.
  const invalidate = () => qc.invalidateQueries({ queryKey: ['class', classId, 'wall'] });
  useWsEvent('share.granted', invalidate, [classId]);
  useWsEvent('share.revoked', invalidate, [classId]);
  useWsEvent('share.removed_by_report', invalidate, [classId]);
  useWsEvent('like.toggled', invalidate, [classId]);

  const posts = wall.data ?? [];

  return (
    <div>
      <Link to="/learn/classroom" className="btn-pill-ghost mb-4 -ml-3 text-[13px]">
        ← My classes
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-[24px]">🏫</span>
        <h1 className="section-heading" style={{ fontSize: '26px' }}>
          {klass.data?.name ?? 'Class wall'}
          {klass.data?.term ? <span className="text-ink-soft font-semibold"> · {klass.data.term}</span> : null}
        </h1>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-wash-sky px-3 py-1 text-[12px] font-bold text-ink mb-6">
        🔒 only your classmates can see this
      </div>

      {klass.data?.is_live && (
        <div className="mb-6 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-3 text-[14px] font-medium text-ink flex items-center gap-3 flex-wrap">
          <span className="sticker-coral">📡 Live now</span>
          <span>Your class is happening right now.</span>
        </div>
      )}

      {wall.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : posts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {posts.map((p) => (
            <WallCard key={p.project_id} post={p} classId={classId!} />
          ))}
        </div>
      ) : (
        <div className="card-base text-center">
          <span className="sticker-sunshine">Nothing yet</span>
          <p className="lead-text mt-4">
            No one has shared anything yet. Be the first!
          </p>
          <Link to="/learn/projects" className="btn-pill-primary mt-6">
            Share something of mine →
          </Link>
        </div>
      )}

      <div className="mt-8">
        <Link to="/learn/projects" className="btn-pill-secondary">
          ✨ Share something of mine to the class →
        </Link>
      </div>
    </div>
  );
}
