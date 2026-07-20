/**
 * Parent-portal Art Studio gallery helpers (image-studio-prd.md D-IS-5).
 *
 * Pure functions only (no React, no fetch) so date-bucket grouping, the header
 * totals and the prompts-CSV export stay unit-testable and deterministic.
 */
import { differenceInCalendarDays, isToday } from 'date-fns';

/** One image row from `GET /kids/:id/artifacts?kind=image` (parent-visible). */
export interface KidImageArtifact {
  id: string;
  kind: string;
  s3_key: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  project_id: string;
  /** Prompt + star cost are stamped at generation time; older rows may lack either. */
  metadata: { prompt?: string; stars_charged?: number };
}

export type GalleryBucket = 'Today' | 'This week' | 'Earlier';

const BUCKET_ORDER: readonly GalleryBucket[] = ['Today', 'This week', 'Earlier'];

/** Anything within the last 7 calendar days (but not today) reads as "This week". */
const WEEK_WINDOW_DAYS = 7;

export function bucketFor(createdAt: string, now: Date = new Date()): GalleryBucket {
  const d = new Date(createdAt);
  if (isToday(d)) return 'Today';
  if (differenceInCalendarDays(now, d) < WEEK_WINDOW_DAYS) return 'This week';
  return 'Earlier';
}

export interface GalleryGroup {
  bucket: GalleryBucket;
  items: KidImageArtifact[];
}

/** Group (already newest-first) artifacts into Today / This week / Earlier. */
export function groupImages(
  artifacts: KidImageArtifact[],
  now: Date = new Date(),
): GalleryGroup[] {
  const byBucket = new Map<GalleryBucket, KidImageArtifact[]>();
  for (const artifact of artifacts) {
    const bucket = bucketFor(artifact.created_at, now);
    const list = byBucket.get(bucket) ?? [];
    list.push(artifact);
    byBucket.set(bucket, list);
  }
  return BUCKET_ORDER.filter((bucket) => byBucket.has(bucket)).map((bucket) => ({
    bucket,
    items: byBucket.get(bucket) ?? [],
  }));
}

/**
 * How many pictures the gallery asks for. `GET /kids/:id/artifacts` caps its
 * result set (default 40, max 200), so we request the maximum AND treat a
 * full-length response as "possibly truncated" — see `GallerySummary.capped`.
 */
export const GALLERY_FETCH_LIMIT = 200;

export interface GallerySummary {
  count: number;
  /** Sum of `metadata.stars_charged` across the RETURNED pictures (0★ hand-drawn rows count 0). */
  totalStars: number;
  /** ISO timestamp of the newest picture, or null when there are none. */
  lastCreatedAt: string | null;
  /**
   * True when the backend returned exactly the requested cap, so older pictures
   * (and the stars spent on them) are very likely missing from these totals.
   * The header must then say "latest N" rather than claim an all-time total.
   */
  capped: boolean;
  /** The cap that was requested — what "latest N" refers to when `capped`. */
  limit: number;
}

export function gallerySummary(
  artifacts: KidImageArtifact[],
  limit: number = GALLERY_FETCH_LIMIT,
): GallerySummary {
  let totalStars = 0;
  let last: string | null = null;
  for (const artifact of artifacts) {
    totalStars += artifact.metadata.stars_charged ?? 0;
    if (!last || artifact.created_at > last) last = artifact.created_at;
  }
  return {
    count: artifacts.length,
    totalStars,
    lastCreatedAt: last,
    capped: artifacts.length >= limit,
    limit,
  };
}

/** RFC-4180-style quoting: wrap when the value holds a comma, quote or newline. */
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
}

/**
 * Client-side CSV of (date, prompt, stars) for parental oversight — no backend
 * endpoint involved (image-studio-prd.md D-IS-5b "Export prompts").
 */
export function buildPromptsCsv(artifacts: KidImageArtifact[]): string {
  const rows = artifacts.map((artifact) =>
    [
      csvCell(artifact.created_at),
      csvCell(artifact.metadata.prompt ?? ''),
      csvCell(String(artifact.metadata.stars_charged ?? '')),
    ].join(','),
  );
  return ['date,prompt,stars', ...rows].join('\n') + '\n';
}
