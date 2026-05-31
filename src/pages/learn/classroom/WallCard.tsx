import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { ReactionBar } from './ReactionBar';
import { ReportModal } from './ReportModal';
import type { WallPost } from './classroomApi';

interface WallCardProps {
  post: WallPost;
  classId: string;
}

export function WallCard({ post, classId }: WallCardProps) {
  const qc = useQueryClient();
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  return (
    <div className="card-base p-4 flex flex-col">
      <Link to={`/learn/classroom/${classId}/post/${post.id}`} className="block">
        <div className="aspect-square rounded-2xl bg-surface overflow-hidden mb-3 flex items-center justify-center">
          {post.thumbnail_url ? (
            <img src={post.thumbnail_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="sticker-sky">project</span>
          )}
        </div>
        <div className="text-[14px] font-bold text-ink truncate">{post.title}</div>
        {post.caption ? (
          <div className="text-[12px] text-ink-soft mt-0.5 truncate">{post.caption}</div>
        ) : null}
        <div className="text-[12px] text-slate2 mt-0.5">by {post.kid_nickname}</div>
      </Link>

      <div className="mt-3 flex items-center justify-between gap-2">
        <ReactionBar post={post} classId={classId} compact />

        {!post.is_owner && (
          <button
            onClick={() => setReporting(true)}
            disabled={reported}
            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-slate2 hover:text-ink hover:bg-surface transition-colors shrink-0"
            title="Tell teacher"
          >
            {reported ? 'Told ✓' : '⚠ Tell teacher'}
          </button>
        )}
      </div>

      {reporting && (
        <ReportModal
          postId={post.id}
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
