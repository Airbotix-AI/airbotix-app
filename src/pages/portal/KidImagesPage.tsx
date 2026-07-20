import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';

import { api } from '@/lib/api';
import { buildPromptsCsv, gallerySummary, groupImages } from './kidImages';
import type { KidImageArtifact } from './kidImages';

interface Kid {
  id: string;
  nickname: string;
}

/**
 * Presigned view URL for one artifact — requested lazily per rendered card, the
 * same POST download-url pattern the Learn studios use (`useArtifactUrl`).
 */
function useSignedImageUrl(artifact: KidImageArtifact): string | null {
  const q = useQuery<string>({
    queryKey: ['artifact-url', artifact.id],
    queryFn: () =>
      api<{ url: string }>(
        `/projects/${artifact.project_id}/artifacts/${artifact.id}/download-url`,
        { method: 'POST' },
      ).then((r) => r.url),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  return q.data ?? null;
}

function ImageCard({ artifact, onOpen }: { artifact: KidImageArtifact; onOpen: () => void }) {
  const url = useSignedImageUrl(artifact);
  const prompt = artifact.metadata.prompt ?? 'Untitled picture';
  const stars = artifact.metadata.stars_charged;
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="image-card"
      className="card-base p-3 text-left transition hover:-translate-y-0.5"
    >
      <div className="aspect-square overflow-hidden rounded-xl bg-wash-mint">
        {url && <img src={url} alt={prompt} className="h-full w-full object-cover" />}
      </div>
      <p className="mt-2 truncate text-[13px] font-semibold text-ink" title={prompt}>
        {prompt}
      </p>
      <p className="mt-1 text-[12px] text-slate2">
        {typeof stars === 'number' && (
          <>
            <span className="font-bold text-ink">{stars}★</span>
            {' · '}
          </>
        )}
        {format(new Date(artifact.created_at), 'd MMM')}
      </p>
    </button>
  );
}

function Lightbox({ artifact, onClose }: { artifact: KidImageArtifact; onClose: () => void }) {
  const url = useSignedImageUrl(artifact);
  const prompt = artifact.metadata.prompt ?? 'Untitled picture';
  const stars = artifact.metadata.stars_charged;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Picture details"
        data-testid="image-lightbox"
        className="card-base max-h-full w-full max-w-lg overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-xl bg-wash-mint">
          {url && <img src={url} alt={prompt} className="w-full object-contain" />}
        </div>
        <p className="mt-4 text-[15px] font-semibold text-ink">{prompt}</p>
        <p className="mt-2 text-[13px] text-slate2">
          {format(new Date(artifact.created_at), 'd MMM yyyy, h:mm a')}
          {typeof stars === 'number' && (
            <>
              {' · '}
              <span className="font-bold text-ink">{stars}★</span>
            </>
          )}
        </p>
        <button type="button" onClick={onClose} className="btn-pill-secondary mt-4">
          Close
        </button>
      </div>
    </div>
  );
}

/**
 * Parent-facing Art Studio picture gallery for one kid — grouped grid, prompt
 * lightbox and a client-side prompts-CSV export. Read-only oversight: there is
 * deliberately NO delete here (image-studio-prd.md D-IS-5).
 */
export function KidImagesPage() {
  const { kidId } = useParams<{ kidId: string }>();
  const [openId, setOpenId] = useState<string | null>(null);

  const kid = useQuery<Kid>({
    queryKey: ['kid', kidId],
    queryFn: () => api<Kid>(`/kids/${kidId}`),
    enabled: !!kidId,
  });

  const images = useQuery<KidImageArtifact[]>({
    queryKey: ['kid', kidId, 'artifacts', 'image'],
    queryFn: () => api<KidImageArtifact[]>(`/kids/${kidId}/artifacts?kind=image`),
    enabled: !!kidId,
    retry: false,
  });

  const name = kid.data?.nickname ?? 'Your kid';
  const list = images.data ?? [];
  const summary = gallerySummary(list);
  const groups = groupImages(list);
  const open = list.find((a) => a.id === openId) ?? null;

  const exportPrompts = () => {
    const blob = new Blob([buildPromptsCsv(list)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'art-studio-prompts.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="portal-image-gallery">
      <Link to={`/portal/family/${kidId}`} className="btn-pill-ghost mb-4 -ml-3">
        ← {name}&apos;s growth
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="eyebrow eyebrow-bubblegum">Art Studio</div>
          <h1 className="section-heading">{name}&apos;s pictures</h1>
          {summary.count > 0 && (
            <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
              {summary.count} picture{summary.count === 1 ? '' : 's'} ·{' '}
              <span className="font-bold text-ink">{summary.totalStars}★</span> spent
              {summary.lastCreatedAt &&
                ` · Last created ${formatDistanceToNow(new Date(summary.lastCreatedAt), {
                  addSuffix: true,
                })}`}
            </p>
          )}
        </div>
        {list.length > 0 && (
          <button
            type="button"
            onClick={exportPrompts}
            data-testid="export-prompts"
            className="btn-pill-secondary shrink-0"
          >
            Export prompts
          </button>
        )}
      </div>

      {images.isLoading ? (
        <p className="lead-text">Loading {name}&apos;s pictures…</p>
      ) : images.isError ? (
        <div className="card-base">
          <p className="lead-text">We couldn&apos;t load {name}&apos;s pictures.</p>
          <button
            type="button"
            onClick={() => void images.refetch()}
            className="btn-pill-secondary mt-3"
          >
            Retry
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className="card-base">
          <div className="text-[40px] leading-none" aria-hidden="true">
            🎨
          </div>
          <h2 className="section-heading mt-3" style={{ fontSize: '24px' }}>
            No pictures yet
          </h2>
          <p className="lead-text mt-2" style={{ fontSize: '15px' }}>
            When {name} paints or makes magic pictures in the Art Studio, they&apos;ll appear
            here for you to enjoy — prompts, stars and all.
          </p>
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.bucket} className="mb-8">
            <div className="eyebrow eyebrow-sky mb-3">{g.bucket}</div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {g.items.map((artifact) => (
                <ImageCard
                  key={artifact.id}
                  artifact={artifact}
                  onOpen={() => setOpenId(artifact.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {open && <Lightbox artifact={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
