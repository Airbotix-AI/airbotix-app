// Typed client for the Riff Pad tutor (music-stage-prd §5A D-MS13, P2a):
// 👻 `POST /llm/riff-ghost` — a faint, erasable starter pattern from the kid's
// idea (cheap `music-ghost` tier); 👂 `POST /llm/riff-advice` — ONE concrete,
// note-grounded next step (text-turn tier, never grades).

import { api } from '@/lib/api';
import type { SeedScore } from './riffPad';

export interface RiffGhostResult {
  riff: SeedScore;
  stars_charged: number;
  balance_after: number;
}

export interface RiffAdviceResult {
  advice: string;
  stars_charged: number;
  balance_after: number;
}

export function requestGhostRiff(prompt: string): Promise<RiffGhostResult> {
  return api<RiffGhostResult>('/llm/riff-ghost', { method: 'POST', body: { prompt } });
}

export function requestRiffAdvice(riff: SeedScore): Promise<RiffAdviceResult> {
  return api<RiffAdviceResult>('/llm/riff-advice', { method: 'POST', body: { riff } });
}
