import { api } from '@/lib/api';

// Teacher PREP creation (teacher-prep-projects). Creation happens IN the app (like the
// kid create flow, and like the game prompt-first path) — NOT in teacher-console — so
// it always runs against the app tab's freshly-refreshed teacher session. (In dev,
// teacher-console + app share one localhost refresh cookie across ports; a create fired
// from teacher-console can race the app tab's refresh rotation and 401.)

export type PrepProjectKind = 'blocks' | 'code';

// Sensible default titles/templates for the create-then-open kinds (Blocks / Web Code).
// Mirrors the kid defaults ("My Blocks" / "My Project" → blocks_blank / blank).
const PREP_DEFAULTS: Record<PrepProjectKind, { title: string; template: string }> = {
  blocks: { title: 'Blocks prep project', template: 'blocks_blank' },
  code: { title: 'Web Code prep project', template: 'blank' },
};

/**
 * Create a teacher-owned prep project of a create-then-open kind (Blocks / Web Code)
 * and return its id. The studio then opens on the real seeded VFS. Game is NOT here —
 * it is prompt-first (created on prompt submit via `createPrepGameProject`).
 */
export async function createPrepProject(
  classId: string,
  kind: PrepProjectKind,
): Promise<{ id: string }> {
  const { title, template } = PREP_DEFAULTS[kind];
  return api<{ id: string }>(`/classes/${classId}/prep-projects`, {
    method: 'POST',
    body: { title, kind, template },
  });
}
