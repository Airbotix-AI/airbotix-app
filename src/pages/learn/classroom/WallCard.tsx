import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/lib/api';
import { toggleLike, type WallPost } from './classroomApi';
import { ReportModal } from './ReportModal';

interface WallCardProps {
  post: WallPost;
  classId: string;
}

// learn-classroom-prd §10: hide like counts under 3 (only positive social proof).
const LIKE_DISPLAY_FLOOR = 3;

export function WallCard({ post, classId }: WallCardProps) {
  const qc = useQueryClient();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [count, setCount] = useState(post.like_count);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const like = useMutation({
    mutationFn: () => toggleLike(post.project_id),
    onMutate: () => {
      // Optimistic toggle (soft pulse, no confetti — §10).
      const next = !liked;
      setLiked(next);
      setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    },
    onSuccess: (res) => {
      setLiked(res.liked);
      setCount(res.like_count);
    },
    onError: (e: unknown) => {
      // Roll back optimistic state on failure (e.g. 422 can't-like-own).
      setLiked(post.liked_by_me);
      setCount(post.like_count);
      if (!(e instanceof ApiError)) return;
    },
  });

  const showCount = count >= LIKE_DISPLAY_FLOOR;

  return (
    <div className="card-base p-4 flex flex-col">
      <Link to={`/learn/classroom/${classId}/post/${post.project_id}`} className="block">
        <div className="aspect-square rounded-2xl bg-surface overflow-hidden mb-3 flex items-center justify-center">
          {post.thumbnail_url ? (
            <img src={post.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="sticker-sky">project</span>
          )}
        </div>
        <div className="text-[14px] font-bold text-ink truncate">{post.title}</div>
        <div className="text-[12px] text-slate2 mt-0.5">by {post.kid_nickname}</div>
      </Link>

      <div className="mt-3 flex items-center justify-between">
        {post.is_owner ? (
          <span className="text-[12px] text-slate2">
            🌟 {showCount ? `${count} likes` : '—'}
          </span>
        ) : (
          <button
            onClick={() => like.mutate()}
            disabled={like.isPending}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-colors ${
              liked ? 'bg-brand-coral text-white' : 'bg-surface text-ink-soft hover:bg-wash-coral hover:text-ink'
            }`}
            aria-pressed={liked}
          >
            {liked ? '🌟' : '♡'} {showCount ? count : 'Like'}
          </button>
        )}

        {!post.is_owner && (
          <button
            onClick={() => setReporting(true)}
            disabled={reported}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate2 hover:text-ink hover:bg-surface transition-colors"
            title="Report"
          >
            {reported ? 'Reported' : '⚠ Report'}
          </button>
        )}
      </div>

      {reporting && (
        <ReportModal
          projectId={post.project_id}
          classId={classId}
          onClose={() => setReporting(false)}
          onReported={() => {
            setReported(true);
            qc.invalidateQueries({ queryKey: ['class', classId, 'wall'] });
          }}
        />
      )}
    </div>
  );
}
