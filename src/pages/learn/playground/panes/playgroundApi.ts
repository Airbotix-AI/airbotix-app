// Playground project I/O. The kid's game files are REAL — they live in the
// backend's storage (S3, Sydney) + Neon metadata, and are read through the
// shared `api` client (JWT + refresh), NOT fetched from S3 by the browser. This
// mirrors the code studio: a game is a backend project whose VFS the server
// seeds from a Phaser template at create time (decision D-CODE1) and serves at
// `GET /projects/:id/code/files`. The kid surface never holds S3 credentials.
//
// `resolveProjectFiles` is the single entry the UI calls: it loads the real
// files when a project is available, and falls back to the local starter
// scaffold when one isn't (a project-less session — e.g. the create/landing flow
// before a project exists, and the game backend isn't built yet) — so the
// playground always opens with files.

import { api } from '@/lib/api';
import { readVfs } from '../../code/codeApi';
import type { VfsFile } from '../../code/codeApi';
import { generateScaffold } from './starterProject';

/** Project kind for games (a Phaser-templated backend project). */
export const GAME_PROJECT_KIND = 'game' as const;

/**
 * The three Phaser starter templates the backend seeds at create time (PRD §3
 * OQ-2 / §12 — `phaser_pong` paddle/physics, `phaser_catcher` click/collect,
 * `phaser_blank` freeform). The hub's picture chips map onto these.
 */
export type GameTemplateId = 'phaser_pong' | 'phaser_catcher' | 'phaser_blank';

/**
 * Create a REAL `kind='game'` backend project (PRD J1 / §4.2). Mirrors the code
 * studio's `createCodeProject`: the backend seeds the Phaser template into the
 * S3-backed VFS at create time and returns the project id; the studio then opens
 * on the real files via `readVfs` (`GET /projects/:id/code/files`). This replaces
 * the throwaway `local-<uuid>` scaffold path.
 */
export async function createGameProject(args: {
  kidId: string | null;
  familyId: string | null;
  /** The kid-chosen game name (PRD J1 "Name your game", e.g. "SUPERCAT"). */
  title: string;
  template: GameTemplateId;
}): Promise<{ id: string }> {
  return api<{ id: string }>(`/projects`, {
    method: 'POST',
    body: {
      title: args.title,
      product_line: 'line_b_coding',
      kind: GAME_PROJECT_KIND,
      template: args.template,
      ...(args.kidId ? { kid_id: args.kidId } : {}),
      ...(args.familyId ? { family_id: args.familyId } : {}),
    },
  });
}

/**
 * Transcribe a voice idea to text for the prompt box (UDL / OD-6 voice input).
 * STT runs SERVER-SIDE via `platform-backend /llm/transcribe` — the kid surface
 * NEVER calls an LLM/STT provider directly (airbotix-app CLAUDE.md #5). The mic
 * captures audio in the browser and posts it (base64 data URL, like the asset
 * pipeline) through the shared `api` client; only the transcript text comes back.
 */
export async function transcribeVoice(args: { audioDataUrl: string }): Promise<{ text: string }> {
  return api<{ text: string }>(`/llm/transcribe`, {
    method: 'POST',
    body: { audio: args.audioDataUrl },
  });
}

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
  /** The kid's game name (PRD J1) — preferred over the prompt to title the scaffold. */
  name?: string;
}

/**
 * Resolve the files to open in the workspace.
 *
 * For a REAL project (`projectId` present) the backend VFS is the SOURCE OF
 * TRUTH — we load it and nothing else. There is deliberately **no scaffold
 * fallback**: if the files can't be loaded (network / auth / backend / a project
 * with no files) we THROW so the caller can show an error and send the kid back
 * to project creation, rather than silently opening a fake starter game.
 *
 * Only when there is NO project — a project-less session (e.g. the create/landing
 * flow before a project exists), not a saved project — do we return the local
 * starter scaffold so the editor never opens empty.
 */
export async function resolveProjectFiles(opts: ResolveFilesOptions): Promise<VfsFile[]> {
  const { projectId, prompt, name } = opts;
  if (projectId) {
    const files = await loadGameFiles(projectId);
    if (files.length === 0) {
      throw new Error(`Project ${projectId} loaded no files`);
    }
    return files;
  }
  // No project (a project-less session): the local scaffold, titled from the prompt/name.
  return generateScaffold(name?.trim() || prompt);
}
