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
  /** Remix: a project VFS asset to vary (image-to-image — D-ASSET-5). */
  refAssetPath?: string;
  /** Remix: a shared Library asset URL to vary (image-to-image — D-ASSET-5). */
  refUrl?: string;
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
  generate: (req: GenAssetRequest, signal?: AbortSignal) => Promise<GenAssetResult>;
}

export const realAssetGenDeps: AssetGenDeps = { generate: generateAsset };

// ── Try-demo seam (try-demo-mode-prd §3 step 7) ───────────────────────────────
// The public `/try/playground` demo serves hand-crafted offline art through this
// seam (the plain e2e/dev stub keeps its deterministic swatches untouched).
// Installed/cleared by `src/pages/try/demoAdapters.ts`; null (off) everywhere else.
let demoAssetGen: ((req: GenAssetRequest) => Promise<GenAssetResult>) | null = null;
export function setDemoAssetGen(gen: ((req: GenAssetRequest) => Promise<GenAssetResult>) | null): void {
  demoAssetGen = gen;
}

/**
 * Generate one asset. With a `projectId` (real studio) it routes through the
 * backend; without one (a project-less session) it falls back to the offline stub so the
 * generate → preview → add-to-game flow works with no network. `signal` lets the
 * caller cancel an in-flight backend generation (the magic-card ✕).
 */
export function runGen(
  req: GenAssetRequest,
  deps: AssetGenDeps = realAssetGenDeps,
  signal?: AbortSignal,
): Promise<GenAssetResult> {
  // Demo mode: the bundled demo art, no network (try-demo-mode-prd §3 step 7).
  if (demoAssetGen) return demoAssetGen(req);
  if (req.projectId) return deps.generate(req, signal);
  return generateAssetStub(req);
}
