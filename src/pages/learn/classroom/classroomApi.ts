// Class Wall + Classroom data layer.
// Typed against learn-classroom-prd.md §4/§5/§6/§9 + class-wall-moderation-prd.md.
//
// New endpoints flagged in learn-classroom-prd §9 (backend session to add):
//   GET    /kids/:id/classes                  (list a kid's active classes)*
//   GET    /classes/:id/wall                  (wall posts)
//   POST   /projects/:id/like                 (toggle like)
//   GET    /projects/:id/likes                (like count + own state)
//   POST   /projects/:id/report               (UGC report → Incident)
//   POST   /projects/:id/share-request        (already shipped; caption + class_id added)
//
// * `/kids/:id/classes` mirrors the `/kids/:id/projects` shape already in
//   §5.7; until it lands, listClasses() degrades to an empty list so the page
//   renders its friendly empty state instead of erroring.

import { api, ApiError } from '@/lib/api';

export interface ClassSummary {
  id: string;
  name: string;
  term?: string | null;
  teacher_name?: string | null;
  classmate_count?: number;
  is_live?: boolean;
}

export interface WallPost {
  project_id: string;
  title: string;
  kid_nickname: string;
  kid_age?: number | null;
  thumbnail_url: string | null;
  like_count: number;
  liked_by_me: boolean;
  is_owner: boolean;
  shared_at: string;
}

export type ReportReason = 'feel_bad' | 'is_mean' | 'shouldnt_show';

export const REPORT_REASONS: Array<{ id: ReportReason; emoji: string; label: string }> = [
  { id: 'feel_bad', emoji: '😟', label: 'This makes me feel bad' },
  { id: 'is_mean', emoji: '😠', label: 'This is mean' },
  { id: 'shouldnt_show', emoji: '🚫', label: 'This shows something it shouldn’t' },
];

export async function listClasses(kidId: string): Promise<ClassSummary[]> {
  try {
    return await api<ClassSummary[]>(`/kids/${kidId}/classes`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) return [];
    throw e;
  }
}

export async function getClass(classId: string): Promise<ClassSummary> {
  return api<ClassSummary>(`/classes/${classId}`);
}

export async function getWall(classId: string): Promise<WallPost[]> {
  try {
    return await api<WallPost[]>(`/classes/${classId}/wall`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) return [];
    throw e;
  }
}

export async function toggleLike(projectId: string): Promise<{ liked: boolean; like_count: number }> {
  return api<{ liked: boolean; like_count: number }>(`/projects/${projectId}/like`, { method: 'POST' });
}

export async function reportPost(args: {
  projectId: string;
  classId: string;
  reason: ReportReason;
}): Promise<void> {
  await api<void>(`/projects/${args.projectId}/report`, {
    method: 'POST',
    body: { reason: args.reason, class_id: args.classId },
  });
}

/**
 * Submit a share-to-class request (learn-classroom-prd §3.1). Reuses the
 * already-shipped `POST /projects/:id/share-request`, extended with class_id +
 * caption per §3.1 step 4.
 */
export async function shareToClass(args: {
  projectId: string;
  classId: string;
  caption?: string;
}): Promise<void> {
  await api<void>(`/projects/${args.projectId}/share-request`, {
    method: 'POST',
    body: { target_visibility: 'class', class_id: args.classId, caption: args.caption ?? '' },
  });
}
