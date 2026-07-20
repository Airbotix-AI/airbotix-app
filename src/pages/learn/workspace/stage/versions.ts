// Version history is a pure client-side aggregation over the session's
// messages (music-stage-prd §3.5 / parent PRD §3.8): every assistant message
// carrying a score is one version, in order. The score lives on the MESSAGE
// itself (`metadata.score` — free-play sessions have no project/Artifact) with
// the artifact's inlined copy as fallback for project-scoped generations.

import type { Message } from '../WorkspacePage';
import { seedRiffFromMetadata, type SeedScore } from './riffPad';
import type { MusicScore } from './scoreTypes';

export interface ScoreVersion {
  /** Message id of the assistant message that carries the score. */
  messageId: string;
  score: MusicScore;
}

export function aggregateScoreVersions(messages: Message[]): ScoreVersion[] {
  const out: ScoreVersion[] = [];
  for (const m of messages) {
    const score = m.metadata?.score ?? m.artifact?.metadata?.score;
    if (score && Array.isArray(score.tracks)) {
      out.push({ messageId: m.id, score });
    }
  }
  return out;
}

/**
 * The kid's Riff Pad seed, persisted by the backend on the seeded generation's
 * assistant message (`metadata.seed`) — the permanent 🎹 frame 0 (§5A D-MS11).
 * First seed wins: the frame-0 story is "where this song started".
 */
export function aggregateSeedRiff(messages: Message[]): SeedScore | null {
  for (const m of messages) {
    const seed = seedRiffFromMetadata((m.metadata as { seed?: unknown } | null | undefined)?.seed);
    if (seed) return seed;
  }
  return null;
}
