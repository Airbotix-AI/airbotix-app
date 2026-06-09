// The AI asset-generation SEAM (design §7 / PRD J5). It has TWO modes behind the
// SAME `runGen` call, mirroring `useGameAgent`'s real/stub split:
//
//   - REAL (a `projectId` is set — the authed studio): the call goes through
//     platform-backend `POST /llm/generate-asset` (`api.generateAsset`), which
//     meters Stars, content-filters the prompt AND the result, audits, and writes
//     the asset into the project VFS. The kid surface NEVER calls an LLM directly
//     (CLAUDE.md #5) — this only POSTs a prompt and renders what comes back.
//   - STUB (no `projectId` — a project-less session): the offline deterministic
//     `generateAssetStub`, so the desktop stays demoable with no backend.
//
// The backend is injected as a dep (`deps`) so tests can route-mock it; the real
// default is `generateAsset` from `@/lib/api`.

import { generateAsset } from '@/lib/api';
import { generateAssetStub } from './assetGenStub';

export interface GenAssetRequest {
  projectId?: string;
  /**
   * Optional. The kid describes what they want and the AI decides image vs
   * audio (D-ASSET-4) — the real backend infers it, the offline stub uses the
   * same keyword heuristic. Callers no longer pass a kind.
   */
  kind?: 'image' | 'audio';
  prompt: string;
  /** Optional source asset to vary ("regenerate variation"). */
  refAssetPath?: string;
  /** Optional target size hint, e.g. "384 × 128". */
  size?: string;
}

export interface GenAssetResult {
  dataUrl: string;
  mime: string;
  meta?: Record<string, unknown>;
}

/** Injectable backend seam (real by default; swapped in unit tests). */
export interface AssetGenDeps {
  generate: (req: GenAssetRequest) => Promise<GenAssetResult>;
}

export const realAssetGenDeps: AssetGenDeps = { generate: generateAsset };

/**
 * Generate one asset. With a `projectId` (real studio) it routes through the
 * backend; without one (a project-less session) it falls back to the offline stub so the
 * generate → preview → add-to-game flow works with no network.
 */
export function runGen(req: GenAssetRequest, deps: AssetGenDeps = realAssetGenDeps): Promise<GenAssetResult> {
  if (req.projectId) return deps.generate(req);
  return generateAssetStub(req);
}
