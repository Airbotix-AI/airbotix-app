import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useMe } from '@/auth/useAuth';
import type { VfsFile } from '../code/codeApi';
import { ReadOnlyGameFrame } from '../playground/ReadOnlyGameFrame';
import {
  CLAP_CAP,
  clapWallGame,
  readPublicSnapshot,
  remixWallGame,
  type WallGame,
} from '../playground/sharingApi';

interface WallGameCardProps {
  game: WallGame;
  classId: string;
}

/**
 * One playable game on the interactive class wall (J7 / D-GAME8). The card plays
 * the game INTERACTIVELY from a published read-only snapshot, in the same
 * opaque-origin sandbox as the studio — but there is NO edit surface here. It also
 * carries the two M8 social affordances scoped safe by OD-8 / J10:
 *   - capped ANONYMOUS claps (a number, no identities/messages/comments), shown
 *     capped ("lots") past the cap so it never becomes a ranked leaderboard;
 *   - a Remix button (only when the teacher enabled remix for the class) that
 *     forks the snapshot into the kid's OWN new project.
 */
export function WallGameCard({ game, classId }: WallGameCardProps) {
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);

  const kidId = me.data?.kind === 'kid' ? me.data.sub : null;
  const familyId = me.data?.kind === 'kid' ? me.data.family_id : null;

  // The same frozen, read-only snapshot the public play route serves (D-GAME8) —
  // fetched only once the kid clicks Play so the wall doesn't load every game.
  const snapshot = useQuery<VfsFile[]>({
    queryKey: ['play', game.shareId],
    queryFn: () => readPublicSnapshot(game.shareId),
    enabled: playing,
    staleTime: Infinity,
  });

  const clap = useMutation({
    mutationFn: () => clapWallGame({ classId, postId: game.postId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class', classId, 'wall-games'] }),
  });

  const remix = useMutation({
    mutationFn: () => remixWallGame({ shareId: game.shareId, kidId, familyId }),
    onSuccess: (res) => navigate(`/learn/playground/${res.id}`),
  });

  // OD-8 equity guard: show the count capped, never a precise ranked number.
  const clapLabel = game.claps >= CLAP_CAP ? `${CLAP_CAP}+ claps` : `${game.claps} claps`;

  return (
    <div className="card-base p-4 flex flex-col" data-testid="wall-game-card">
      <button
        type="button"
        onClick={() => setPlaying(true)}
        className="aspect-square rounded-2xl bg-black overflow-hidden mb-3 relative block w-full"
        aria-label={`Play ${game.title}`}
      >
        {playing && snapshot.data && snapshot.data.length > 0 ? (
          <ReadOnlyGameFrame files={snapshot.data} testId="wall-game-iframe" title={game.title} />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-white text-[28px]">
            {playing ? '…' : '▶'}
          </span>
        )}
      </button>

      <div className="text-[14px] font-bold text-ink truncate">{game.title}</div>
      <div className="text-[12px] text-slate2 mt-0.5" data-testid="authorship-label">
        {game.handle ? `made by ${game.handle} with AI help` : 'made with AI help'}
      </div>
      {game.remixed_from ? (
        <div className="text-[11px] text-ink-soft mt-0.5" data-testid="remix-attribution">
          Remixed from {game.remixed_from}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => clap.mutate()}
          disabled={game.clapped || clap.isPending}
          className="rounded-full bg-wash-sky px-2.5 py-1 text-[12px] font-bold text-ink hover:bg-brand-sky/30 transition-colors disabled:opacity-60 shrink-0"
          data-testid="wall-claps"
          title="Send a clap"
        >
          👏 {game.clapped ? 'Clapped ✓' : clapLabel}
        </button>

        {game.remix_enabled && (
          <button
            type="button"
            onClick={() => remix.mutate()}
            disabled={remix.isPending}
            className="rounded-full bg-wash-mint px-2.5 py-1 text-[12px] font-bold text-ink hover:bg-brand-mint/30 transition-colors disabled:opacity-60 shrink-0"
            data-testid="wall-remix-btn"
            title="Remix this game"
          >
            {remix.isPending ? 'Forking…' : '🔀 Remix'}
          </button>
        )}
      </div>
    </div>
  );
}
