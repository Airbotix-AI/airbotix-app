// Typed client for `POST /llm/music-score` (music-workspace-tech-spec §5.2,
// music-stage-prd §3.4). Suggestion-card iterations reuse the same endpoint
// with `existingScore` + a structured `modifier` key — no new endpoints.

import { api } from '@/lib/api';
import type { MusicScore } from './scoreTypes';
import type { SuggestionKey } from './stageData';

export interface MusicScoreOptions {
  genre?: string;
  mood?: string;
  duration?: number;
  instruments?: string[];
}

export interface MusicScoreRequest {
  /** 1–800 chars, firewall-checked server-side. */
  prompt: string;
  options?: MusicScoreOptions;
  /** Current score when iterating — the LLM keeps untouched tracks stable. */
  existingScore?: MusicScore;
  /** Suggestion-card key (structured, never free text). */
  modifier?: SuggestionKey;
}

export interface MusicScoreResult {
  stars_charged: number;
  balance_after: number;
  artifact_id: string | null;
}

export function generateMusicScore(req: MusicScoreRequest): Promise<MusicScoreResult> {
  return api<MusicScoreResult>('/llm/music-score', {
    method: 'POST',
    body: {
      prompt: req.prompt,
      options: req.options,
      existingScore: req.existingScore,
      modifier: req.modifier,
    },
  });
}
