import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';
import {
  WALL_REACTIONS,
  addReaction,
  removeReaction,
  type WallPost,
  type WallReactionEmoji,
} from './classroomApi';

interface ReactionBarProps {
  post: WallPost;
  classId: string;
  /** Compact = wall-card grid; non-compact = post detail page. */
  compact?: boolean;
}

/**
 * Tap-to-react emoji bar (class-wall-moderation-prd §2 fixed set + §6.2 UX):
 * tap opens the 6-emoji selector, single tap-to-react, one reaction per kid
 * (changeable). Counts hidden until at least one reaction lands (no
 * first-poster anxiety). Owners see read-only totals.
 */
export function ReactionBar({ post, classId, compact }: ReactionBarProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  // Optimistic local copy of my reaction + counts; reconciled by wall refetch.
  const [mine, setMine] = useState<WallReactionEmoji | null>(post.my_reaction);
  const [counts, setCounts] = useState<Partial<Record<WallReactionEmoji, number>>>(
    post.reaction_counts ?? {},
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['class', classId, 'wall'] });

  const adjust = (emoji: WallReactionEmoji, delta: number) =>
    setCounts((c) => ({ ...c, [emoji]: Math.max(0, (c[emoji] ?? 0) + delta) }));

  const rollback = () => {
    setMine(post.my_reaction);
    setCounts(post.reaction_counts ?? {});
  };

  const react = useMutation({
    mutationFn: (emoji: WallReactionEmoji) => addReaction({ classId, postId: post.id, emoji }),
    onSuccess: invalidate,
    onError: (e: unknown) => {
      rollback();
      if (!(e instanceof ApiError)) return;
    },
  });

  const unreact = useMutation({
    mutationFn: () => removeReaction({ classId, postId: post.id }),
    onSuccess: invalidate,
    onError: (e: unknown) => {
      rollback();
      if (!(e instanceof ApiError)) return;
    },
  });

  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  // Owners: read-only celebration of the reactions their post earned.
  if (post.is_owner) {
    if (total === 0) return <span className="text-[12px] text-slate2">No reactions yet</span>;
    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {WALL_REACTIONS.filter((e) => (counts[e] ?? 0) > 0).map((e) => (
          <span
            key={e}
            className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[12px] font-bold text-ink"
          >
            {e} {counts[e]}
          </span>
        ))}
      </div>
    );
  }

  const pick = (emoji: WallReactionEmoji) => {
    setOpen(false);
    if (mine === emoji) {
      // Tapping your current reaction again removes it.
      setMine(null);
      adjust(emoji, -1);
      unreact.mutate();
      return;
    }
    if (mine) adjust(mine, -1);
    setMine(emoji);
    adjust(emoji, 1);
    react.mutate(emoji);
  };

  const busy = react.isPending || unreact.isPending;

  return (
    <div className="relative flex items-center gap-1.5 min-w-0">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold transition-colors ${
          mine ? 'bg-brand-coral text-white' : 'bg-surface text-ink-soft hover:bg-wash-coral hover:text-ink'
        }`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Add a reaction"
      >
        {mine ?? '➕'}
        {/* No count shown until at least one reaction (§6.2). */}
        {total > 0 ? <span className="tabular-nums">{total}</span> : <span>React</span>}
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-30"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div
            className={`absolute z-40 ${compact ? 'bottom-full mb-2 left-0' : 'top-full mt-2 left-0'} flex gap-1 rounded-full bg-canvas-pure px-2 py-1.5 shadow-card-soft border border-hairline`}
            role="menu"
          >
            {WALL_REACTIONS.map((e) => (
              <button
                key={e}
                onClick={() => pick(e)}
                className={`text-[20px] leading-none rounded-full p-1 transition-transform hover:scale-125 ${
                  mine === e ? 'bg-wash-coral' : ''
                }`}
                aria-label={`React with ${e}`}
                role="menuitem"
              >
                {e}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
