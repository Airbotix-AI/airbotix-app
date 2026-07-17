import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useWsEvent } from '@/lib/useWsEvent';
import { getClass, type ClassSummary } from './classroomApi';
import { getWallGames, type WallGame } from '../playground/sharingApi';
import { WallGameCard } from './WallGameCard';

/**
 * Interactive class-wall GAMES view — `/learn/classroom/:classId/games`
 * (learn-game-studio-prd.md §17.7 J7 / D-GAME8). Sibling to the artifact wall
 * (ClassWallViewPage): this one renders games that play INTERACTIVELY from a
 * published read-only snapshot in the opaque-origin sandbox, with capped anonymous
 * claps (OD-8) and per-card Remix (J10). The wall NEVER exposes an editable
 * surface — the snapshot is read-only and the iframe is the same strict sandbox.
 */
export function ClassGamesWallPage() {
  const { classId } = useParams<{ classId: string }>();
  const qc = useQueryClient();

  const klass = useQuery<ClassSummary>({
    queryKey: ['class', classId],
    queryFn: () => getClass(classId!),
    enabled: !!classId,
  });

  const games = useQuery<WallGame[]>({
    queryKey: ['class', classId, 'wall-games'],
    queryFn: () => getWallGames(classId!),
    enabled: !!classId,
  });

  // Live wall updates: a game published / a clap added (reuse the wall WS beats).
  const invalidate = () => qc.invalidateQueries({ queryKey: ['class', classId, 'wall-games'] });
  useWsEvent('wall.post.published', invalidate, [classId]);
  useWsEvent('wall.reaction', invalidate, [classId]);

  const list = games.data ?? [];

  return (
    <div data-testid="games-wall">
      <Link to="/learn/classroom" className="btn-pill-ghost mb-4 -ml-3 text-[13px]">
        ← My classes
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <span className="text-[24px]">🎮</span>
        <h1 className="section-heading" style={{ fontSize: '26px' }}>
          {klass.data?.name ? `${klass.data.name} — Games` : 'Class games'}
        </h1>
      </div>
      <div className="inline-flex items-center gap-2 rounded-full bg-wash-sky px-3 py-1 text-[12px] font-bold text-ink mb-6">
        🔒 only your classmates can play these
      </div>

      {games.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : list.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {list.map((g) => (
            <WallGameCard key={g.postId} game={g} classId={classId!} />
          ))}
        </div>
      ) : (
        <div className="card-base text-center" data-testid="games-wall-empty">
          <span className="sticker-sunshine">No games yet</span>
          <p className="lead-text mt-4">No one has shared a game yet. Be the first!</p>
          <Link
            to={`/learn/playground/new?class=${encodeURIComponent(classId!)}`}
            className="btn-pill-primary mt-6"
          >
            Make a game →
          </Link>
        </div>
      )}
    </div>
  );
}
