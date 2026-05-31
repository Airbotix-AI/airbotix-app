import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, ApiError } from '@/lib/api';
import { getWall, toggleLike, type WallPost } from './classroomApi';
import { ReportModal } from './ReportModal';

interface Project {
  id: string;
  title: string;
  visibility: 'private' | 'class' | 'public';
}

interface Artifact {
  id: string;
  kind: 'image' | 'audio' | 'video' | 'text' | 'code_file' | 'project_export';
  mime_type: string;
}

const LIKE_DISPLAY_FLOOR = 3;

/** Single shared post — `/learn/classroom/:classId/post/:projectId` (§4.3). */
export function ClassPostPage() {
  const { classId, projectId } = useParams<{ classId: string; projectId: string }>();
  const qc = useQueryClient();
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  const project = useQuery<Project>({
    queryKey: ['project', projectId],
    queryFn: () => api<Project>(`/projects/${projectId}`),
    enabled: !!projectId,
  });

  const artifacts = useQuery<Artifact[]>({
    queryKey: ['project', projectId, 'artifacts'],
    queryFn: () => api<Artifact[]>(`/projects/${projectId}/artifacts`),
    enabled: !!projectId,
  });

  // Pull this post's wall metadata (nickname, likes, owner flag) from the class wall.
  const wall = useQuery<WallPost[]>({
    queryKey: ['class', classId, 'wall'],
    queryFn: () => getWall(classId!),
    enabled: !!classId,
  });
  const post = wall.data?.find((p) => p.project_id === projectId) ?? null;

  const like = useMutation({
    mutationFn: () => toggleLike(projectId!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['class', classId, 'wall'] }),
    onError: (e: unknown) => {
      if (!(e instanceof ApiError)) return;
    },
  });

  if (project.isLoading) return <p className="lead-text">Loading…</p>;
  if (!project.data) {
    return (
      <div>
        <div className="eyebrow">Post</div>
        <h1 className="section-heading">Not found</h1>
        <Link to={`/learn/classroom/${classId}`} className="btn-pill-secondary mt-6">
          ← Back to wall
        </Link>
      </div>
    );
  }

  const p = project.data;
  const showCount = (post?.like_count ?? 0) >= LIKE_DISPLAY_FLOOR;

  return (
    <div>
      <Link to={`/learn/classroom/${classId}`} className="btn-pill-ghost mb-4 -ml-3 text-[13px]">
        ← Class wall
      </Link>

      <div className="pack-card sky mb-6 cursor-default" style={{ minHeight: 'auto' }}>
        <span className="pack-blob" />
        <div className="relative">
          <h1 className="text-[28px] font-bold leading-tight">{p.title}</h1>
          {post && (
            <p className="mt-2 text-[13px] font-semibold opacity-90">
              by {post.kid_nickname}
              {post.kid_age != null ? ` · age ${post.kid_age}` : ''}
            </p>
          )}
        </div>
      </div>

      {post?.is_owner && (
        <div className="card-base mb-6 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[13px] text-ink-soft">
            Shared {new Date(post.shared_at).toLocaleDateString()} ·{' '}
            {showCount ? `${post.like_count} likes from classmates` : 'likes from classmates'}
          </span>
        </div>
      )}

      {/* Artifact gallery (read-only) */}
      {artifacts.isLoading ? (
        <p className="lead-text">Loading…</p>
      ) : artifacts.data && artifacts.data.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          {artifacts.data.map((a) => (
            <ReadOnlyArtifact key={a.id} artifact={a} projectId={projectId!} />
          ))}
        </div>
      ) : (
        <div className="card-base text-center mb-8">
          <span className="sticker-sky">Nothing to show</span>
        </div>
      )}

      {/* Like + Report */}
      {post && !post.is_owner && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => like.mutate()}
            disabled={like.isPending}
            className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[14px] font-bold transition-colors ${
              post.liked_by_me ? 'bg-brand-coral text-white' : 'bg-surface text-ink-soft hover:bg-wash-coral hover:text-ink'
            }`}
          >
            {post.liked_by_me ? '🌟 Liked' : '♡ Like'}
            {showCount ? ` · ${post.like_count}` : ''}
          </button>
          <button
            onClick={() => setReporting(true)}
            disabled={reported}
            className="rounded-full px-3 py-2 text-[12px] font-semibold text-slate2 hover:text-ink hover:bg-surface transition-colors"
          >
            {reported ? 'Reported' : '⚠ This makes me uncomfortable'}
          </button>
        </div>
      )}

      {reporting && (
        <ReportModal
          projectId={projectId!}
          classId={classId!}
          onClose={() => setReporting(false)}
          onReported={() => setReported(true)}
        />
      )}
    </div>
  );
}

interface SignedDownloadResponse {
  url: string;
  mime_type: string;
}

function ReadOnlyArtifact({ artifact, projectId }: { artifact: Artifact; projectId: string }) {
  const isImage = artifact.kind === 'image';
  const isAudio = artifact.kind === 'audio';
  const isVideo = artifact.kind === 'video';

  const signed = useQuery<SignedDownloadResponse>({
    queryKey: ['artifact', artifact.id, 'download'],
    queryFn: () =>
      api<SignedDownloadResponse>(`/projects/${projectId}/artifacts/${artifact.id}/download-url`, {
        method: 'POST',
      }),
    enabled: isImage || isAudio || isVideo,
    staleTime: 4 * 60_000,
  });
  const url = signed.data?.url;

  return (
    <div className="card-base p-3">
      <div className="aspect-square rounded-xl bg-surface overflow-hidden flex items-center justify-center">
        {isImage && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : isAudio && url ? (
          <audio controls className="w-full">
            <source src={url} type={artifact.mime_type} />
          </audio>
        ) : isVideo && url ? (
          <video controls className="h-full w-full object-cover">
            <source src={url} type={artifact.mime_type} />
          </video>
        ) : (
          <span className="sticker-sky">{artifact.kind}</span>
        )}
      </div>
    </div>
  );
}
