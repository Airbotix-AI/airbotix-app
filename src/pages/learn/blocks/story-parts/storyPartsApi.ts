// Story Part progress backend contract — kid-scoped Story Part evidence +
// adjacent unlock (platform-backend /story-parts). The server enforces the
// unlock chain; the client only renders what the API says is open.

import { api } from '@/lib/api';

export interface StoryPartEvidence {
  schema_version: 1;
  selections: Record<string, string[]>;
  prediction?: string;
}

export interface StoryPartProgressEntry {
  part_id: string;
  completed_at: string;
  evidence: StoryPartEvidence | Record<string, never>;
}

/** Chapter seal (e.g. C1 出世印) — aggregated by the SERVER over stored
 *  evidence; the client only renders `lit`, it never computes it. */
export interface StoryChapterSeal {
  seal_id: string;
  chapter_code: string;
  lit: boolean;
  missing: string[];
}

export interface StoryLineProgress {
  story_line_id: string;
  completed: StoryPartProgressEntry[];
  unlocked_part_ids: string[];
  /** Optional for older cached payloads; present on current backends. */
  chapter_seals?: StoryChapterSeal[];
}

export function fetchStoryLineProgress(storyLineId: string): Promise<StoryLineProgress> {
  return api<StoryLineProgress>(`/story-parts/${storyLineId}`);
}

export function completeStoryPart(
  storyLineId: string,
  partId: string,
  evidence: StoryPartEvidence,
): Promise<{ part_id: string; completed_at: string }> {
  return api<{ part_id: string; completed_at: string }>(
    `/story-parts/${storyLineId}/parts/${partId}`,
    { method: 'PUT', body: { evidence } },
  );
}
