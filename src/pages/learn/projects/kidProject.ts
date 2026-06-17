// Shared kid-project types + helpers used by both "My Works" (`/learn/projects`)
// and the class hub "My work" tab. The backend `GET /kids/:id/projects` now
// returns `class_id` + the four-state `visibility` (my-classes-prd §3.2).

import type { ProjectVisibility } from '../classroom/classroomApi';

export interface KidProject {
  id: string;
  title: string;
  kind?: 'creative' | 'code' | 'game' | 'blocks';
  product_line: 'line_a_creative' | 'line_b_coding';
  /** Four-state placement (my-classes-prd §3.2). */
  visibility: ProjectVisibility;
  /** Set when the project is attached to a class (Class work / On the wall). */
  class_id: string | null;
  thumbnail_s3_key: string | null;
  star_cost_total: number;
  artifact_count: number;
  status: 'in_progress' | 'submitted' | 'accepted' | 'archived';
  updated_at: string;
}

// ── Status (Working / Finished) — separate from the placement badge ─────────

export function isFinished(p: KidProject): boolean {
  return p.status !== 'in_progress';
}

export const STATUS_TAG: Record<'working' | 'finished', { bg: string; text: string; label: string }> =
  {
    working: { bg: 'bg-wash-sunshine', text: 'text-ink', label: 'Working' },
    finished: { bg: 'bg-wash-mint', text: 'text-ink', label: 'Finished' },
  };

// ── Placement badge (Personal / Class work / On the wall / Public) ──────────
// `public` (the double-consent world share) is its OWN placement: it must be
// labelled honestly (an internet-public work is NOT class-only) and must expose
// NO mutating kid actions — changing `public` is gated behind the teacher+parent
// double-consent flow, never the kid ⋯ menu (my-classes-prd §11). Do not collapse
// `public` into `on_wall`, which would misrepresent who-can-see-it and offer
// `take_off_wall`/`move_to_personal` on a public project.

export type Placement = 'personal' | 'class_work' | 'on_wall' | 'public';

export function placementOf(p: KidProject): Placement {
  if (p.visibility === 'class') return 'on_wall';
  if (p.visibility === 'class_work') return 'class_work';
  if (p.visibility === 'public') return 'public';
  return 'personal';
}

// ── Thumbnail fallback (by product line) ────────────────────────────────────

export const THUMB_BG: Record<string, string> = {
  line_a_creative: 'bg-wash-bubblegum',
  line_b_coding: 'bg-wash-sky',
};

export const THUMB_ICON: Record<string, string> = {
  line_a_creative: '🎨',
  line_b_coding: '💻',
};

/** Resume opens a game/blocks in its studio; other kinds open the studio too. */
export function resumeHref(p: KidProject): string {
  if (p.kind === 'game') return `/learn/playground/${p.id}`;
  if (p.kind === 'blocks') return `/learn/blocks/${p.id}`;
  if (p.kind === 'code') return `/learn/code/${p.id}`;
  return `/learn/projects/${p.id}`;
}
