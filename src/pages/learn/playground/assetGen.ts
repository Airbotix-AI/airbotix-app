// The AI asset-generation SEAM (design §7). `runGen` defaults to the local
// deterministic stub so the Asset Viewer's generate → preview → use flow works
// offline. Swapping in the real backend later is a ONE-LINE change here (point
// `runGen` at `api.generateAsset`) — callers (AssetViewerPane) stay identical.
//
// Hard rule: the kid surface NEVER calls an LLM directly. The real call goes
// through platform-backend `POST /llm/generate-asset` (see `generateAsset` in
// `src/lib/api.ts`), which meters Stars + audits. That endpoint is not built
// yet, hence the stub.

import { generateAssetStub } from './assetGenStub';

export interface GenAssetRequest {
  projectId?: string;
  kind: 'image' | 'audio';
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

/**
 * Generate one asset. SWAP SEAM: defaults to the stub; replace the body with
 * `return generateAsset(req);` (from `@/lib/api`) once the backend ships.
 */
export function runGen(req: GenAssetRequest): Promise<GenAssetResult> {
  return generateAssetStub(req);
}
