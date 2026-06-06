// Playground project I/O. The kid's game files are REAL — they live in the
// backend's storage (S3, Sydney) + Neon metadata, and are read through the
// shared `api` client (JWT + refresh), NOT fetched from S3 by the browser. This
// mirrors the code studio: a game is a backend project whose VFS the server
// seeds from a Phaser template at create time (decision D-CODE1) and serves at
// `GET /projects/:id/code/files`. The kid surface never holds S3 credentials.
//
// `resolveProjectFiles` is the single entry the UI calls: it loads the real
// files when a project is available, and falls back to the local starter
// scaffold when one isn't (the DEV `/playground-sandbox` has no project, and the
// game backend isn't built yet) — so the playground always opens with files.

import { readVfs } from '../../code/codeApi';
import type { VfsFile } from '../../code/codeApi';
import { generateScaffold } from './starterProject';

/** Project kind for games (a Phaser-templated backend project). */
export const GAME_PROJECT_KIND = 'game' as const;

/**
 * Load a game project's files from the backend (S3-backed, Sydney) via the
 * shared `api` client. Thin wrapper over the code studio's `readVfs` — the same
 * `GET /projects/:id/code/files` endpoint serves every project kind.
 */
export async function loadGameFiles(projectId: string): Promise<VfsFile[]> {
  return readVfs(projectId);
}

export interface ResolveFilesOptions {
  /** When present, load the real project files from the backend (S3-backed). */
  projectId?: string;
  /** Used only by the local fallback scaffold (stamped into its entry file). */
  prompt: string;
}

/**
 * Resolve the files to open in the workspace. With a `projectId` we load the
 * REAL files from the backend; with none — or if that load fails (offline /
 * backend not ready / empty) — we fall back to the local starter scaffold so the
 * editor never opens empty. This is the swap seam: once the authed
 * `/learn/playground/:projectId` route + game backend exist, the real path is
 * exercised automatically; nothing else in the UI changes.
 */
export async function resolveProjectFiles(opts: ResolveFilesOptions): Promise<VfsFile[]> {
  const { projectId, prompt } = opts;
  if (projectId) {
    try {
      const files = await loadGameFiles(projectId);
      if (files.length > 0) return files;
    } catch {
      // Network / auth / backend-not-ready → fall back to the local scaffold.
    }
  }
  return generateScaffold(prompt);
}
