// Class Wall + Classroom data layer.
// Typed against the CANONICAL backend contract:
//   - class-wall-moderation-prd.md §4 (WallPost / WallReaction / WallReport),
//     §6 (kid UX), §10 (endpoint table)
//   - platform-backend-api-spec.md §5 (projects / share-request)
//
// Canonical wall endpoints (class-wall-moderation-prd §10):
//   GET    /classes/:id/wall                              wall posts (kid / parent / teacher)
//   POST   /classes/:id/wall/posts                        share a project to the wall (kid)
//   POST   /classes/:id/wall/posts/:postId/reactions      add/replace a reaction (kid)
//   DELETE /classes/:id/wall/posts/:postId/reactions      remove own reaction (kid)
//   POST   /classes/:id/wall/posts/:postId/reports        report a post (kid)
//
// `/kids/:id/classes` (a kid's active classes) is flagged in learn-classroom-prd
// §9; until it lands, listClasses() degrades to an empty list so the page renders
// its friendly empty state instead of erroring.

import { api, ApiError } from '@/lib/api';

export interface ClassSummary {
  id: string;
  name: string;
  term?: string | null;
  teacher_name?: string | null;
  classmate_count?: number;
  is_live?: boolean;
}

// ── Enriched "My Classes" card (my-classes-prd §4 + §6, D-MC-3) ─────────────
// `GET /classes/mine` is enriched server-side (no per-card N+1): one query
// returns everything the My Classes cards render. Kid-facing + redacted (D-MC-4
// — teacher NAME + avatar only, classmate COUNT only, no roster/PII/pricing).

export interface ClassMineSummary {
  id: string;
  name: string;
  status: 'active' | 'completed';
  course_title: string | null;
  cover_image_url: string | null;
  teacher_name: string | null;
  teacher_avatar_url: string | null;
  classmate_count: number;
  is_live: boolean;
  /** ISO timestamp of the next session, if any. */
  next_session_at: string | null;
  lessons_total: number;
  lessons_done: number;
  stars_earned: number;
}

/**
 * The signed-in kid's enriched classes (my-classes-prd §4). Degrades to an
 * empty list on 404/501 so the page renders its friendly empty state while the
 * enriched endpoint is rolling out, instead of erroring.
 */
export async function listMyClasses(): Promise<ClassMineSummary[]> {
  try {
    return await api<ClassMineSummary[]>(`/classes/mine`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) return [];
    throw e;
  }
}

// ── Reactions (class-wall-moderation-prd §2 — fixed 6-emoji set) ────────────

export const WALL_REACTIONS = ['🌟', '🎉', '💡', '🥰', '🦄', '🎨'] as const;
export type WallReactionEmoji = (typeof WALL_REACTIONS)[number];

export function isWallReaction(emoji: string): emoji is WallReactionEmoji {
  return (WALL_REACTIONS as readonly string[]).includes(emoji);
}

// ── Wall post (mirrors the WallPost model in §4.2) ─────────────────────────

export interface WallPost {
  /** WallPost id — the moderation/reaction/report subject (NOT the project id). */
  id: string;
  project_id: string;
  caption: string | null;
  title: string;
  kid_nickname: string;
  kid_age?: number | null;
  thumbnail_url: string | null;
  /** Cached `{ '🌟': 3, ... }` counts (§4.2 `reaction_counts`). */
  reaction_counts: Partial<Record<WallReactionEmoji, number>>;
  /** This kid's own reaction, if any (one reaction per kid per post). */
  my_reaction: WallReactionEmoji | null;
  is_owner: boolean;
  shared_at: string;
}

// ── Reports (class-wall-moderation-prd §4.4 — fixed kid-friendly reasons) ───

export type ReportReason =
  | 'mean_or_unkind'
  | 'scary_or_upsetting'
  | 'not_school_appropriate'
  | 'someone_else_should_see_this';

export const REPORT_REASONS: Array<{ id: ReportReason; emoji: string; label: string }> = [
  { id: 'mean_or_unkind', emoji: '😠', label: 'This is mean or unkind' },
  { id: 'scary_or_upsetting', emoji: '😟', label: 'This is scary or upsetting' },
  { id: 'not_school_appropriate', emoji: '🚫', label: "This shouldn't be at school" },
  { id: 'someone_else_should_see_this', emoji: '🆘', label: 'A grown-up should see this' },
];

// The signed-in kid's own active classes. Uses the principal (the `kidId` arg is
// kept for the caller's query key); the backend resolves the kid from the token.
export async function listClasses(_kidId: string): Promise<ClassSummary[]> {
  try {
    return await api<ClassSummary[]>(`/classes/mine`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) return [];
    throw e;
  }
}

export async function getClass(classId: string): Promise<ClassSummary> {
  return api<ClassSummary>(`/classes/${classId}`);
}

/** GET /classes/:id/wall — degrades to empty so the page shows its empty state. */
export async function getWall(classId: string): Promise<WallPost[]> {
  try {
    const res = await api<WallPost[] | { posts: WallPost[] }>(`/classes/${classId}/wall`);
    return Array.isArray(res) ? res : (res.posts ?? []);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) return [];
    throw e;
  }
}

/**
 * Add or replace this kid's reaction on a post (one reaction per kid per post,
 * changeable — §4.3 unique constraint). `POST …/reactions { emoji }`.
 */
export async function addReaction(args: {
  classId: string;
  postId: string;
  emoji: WallReactionEmoji;
}): Promise<void> {
  await api<void>(`/classes/${args.classId}/wall/posts/${args.postId}/reactions`, {
    method: 'POST',
    body: { emoji: args.emoji },
  });
}

/** Remove this kid's reaction. `DELETE …/reactions`. */
export async function removeReaction(args: { classId: string; postId: string }): Promise<void> {
  await api<void>(`/classes/${args.classId}/wall/posts/${args.postId}/reactions`, {
    method: 'DELETE',
  });
}

/**
 * Report a peer's post. `POST …/reports { reason, reason_text? }`
 * (class-wall-moderation-prd §4.4 + §5.3).
 */
export async function reportPost(args: {
  classId: string;
  postId: string;
  reason: ReportReason;
  reasonText?: string;
}): Promise<void> {
  await api<void>(`/classes/${args.classId}/wall/posts/${args.postId}/reports`, {
    method: 'POST',
    body: {
      reason: args.reason,
      ...(args.reasonText ? { reason_text: args.reasonText } : {}),
    },
  });
}

/**
 * Share a project to a class wall. Per the canonical contract
 * (class-wall-moderation-prd §5.1) this creates a WallPost directly via
 * `POST /classes/:id/wall/posts { project_id, caption }` — the post enters the
 * moderation pipeline server-side (pending_auto → published / pending_teacher).
 */
export async function shareToClass(args: {
  projectId: string;
  classId: string;
  caption?: string;
}): Promise<void> {
  await api<void>(`/classes/${args.classId}/wall/posts`, {
    method: 'POST',
    body: { project_id: args.projectId, caption: args.caption ?? '' },
  });
}

// ── Project placement (my-classes-prd §3.2 lifecycle) ───────────────────────
// The kid moves a project between its three "who can see it" states with
// single-purpose, reversible actions. `PATCH /projects/:id/placement` is the
// canonical mover for everything EXCEPT putting a project on the wall (that
// stays the existing wall-post path — `shareToClass` above):
//   - use_for_class   Personal → Class work (attach to a class)
//   - take_off_wall   On the wall → Class work
//   - move_to_personal Class work / On the wall → Personal (detaches, private)

export type PlacementAction = 'use_for_class' | 'take_off_wall' | 'move_to_personal';

/** Project visibility / placement (my-classes-prd §3.2). */
export type ProjectVisibility = 'private' | 'class_work' | 'class' | 'public';

export async function updatePlacement(args: {
  projectId: string;
  action: PlacementAction;
  classId?: string;
}): Promise<void> {
  await api<void>(`/projects/${args.projectId}/placement`, {
    method: 'PATCH',
    body: {
      action: args.action,
      ...(args.classId ? { class_id: args.classId } : {}),
    },
  });
}
