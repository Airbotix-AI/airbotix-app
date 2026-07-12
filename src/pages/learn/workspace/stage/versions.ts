// Version history is a pure client-side aggregation over the session's
// messages (music-stage-prd §3.5 / parent PRD §3.8): every assistant message
// whose artifact carries `metadata.score` is one version, in order.

import type { Message } from '../WorkspacePage';
import type { MusicScore } from './scoreTypes';

export interface ScoreVersion {
  /** Message id of the assistant message that carries the score artifact. */
  messageId: string;
  score: MusicScore;
}

export function aggregateScoreVersions(messages: Message[]): ScoreVersion[] {
  const out: ScoreVersion[] = [];
  for (const m of messages) {
    const score = m.artifact?.metadata?.score;
    if (score && Array.isArray(score.tracks)) {
      out.push({ messageId: m.id, score });
    }
  }
  return out;
}
