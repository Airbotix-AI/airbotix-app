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

// ── Try-demo seam (try-demo-mode-prd D-DEMO-02/03) ────────────────────────────
// The public `/try/playground` demo bundles its starter VFS client-side;
// `resolveProjectFiles` serves it instead of the backend / local scaffold.
// Installed/cleared by `src/pages/try/demoAdapters.ts`; null (off) everywhere else.
let demoProjectFiles: (() => VfsFile[]) | null = null;
export function setDemoProjectFiles(provider: (() => VfsFile[]) | null): void {
  demoProjectFiles = provider;
}

/**
 * The starter templates the backend seeds at create time (PRD §3 OQ-2 / §12 +
 * learn-game-studio-3d-prd.md D-3D-06c). Phaser (2D): `phaser_pong`,
 * `phaser_catcher`, `phaser_blank`. three.js (3D): `three_spin`, `three_collect`,
 * `three_blank`. The hub's picture chips map onto these.
 */
export type GameTemplateId =
  | 'phaser_pong'
  | 'phaser_catcher'
  | 'phaser_blank'
  | 'three_spin'
  | 'three_collect'
  | 'three_blank';

/**
 * Create a REAL `kind='game'` backend project (PRD J1 / §4.2). The backend seeds
 * the starter template into the S3-backed VFS and returns the project id; the
 * studio then opens on the real files via `readVfs`.
 *
 * `template` is OPTIONAL: when omitted (the free-prompt landing path), the backend
 * INFERS the engine (2D Phaser vs 3D three.js) from the prompt/title and seeds the
 * matching blank starter (learn-game-studio-3d-prd.md D-3D-07). Pass `template`
 * only when the kid explicitly picked a starter chip. Do NOT hardcode a Phaser
 * template here — that would force every game (incl. "make a 3D …") into 2D.
 */
export async function createGameProject(args: {
  kidId: string | null;
  familyId: string | null;
  /** The kid's prompt / chosen game name — the backend infers the engine from it. */
  title: string;
  /** Only set when a specific starter chip was chosen; omit to let the backend infer. */
  template?: GameTemplateId;
}): Promise<{ id: string }> {
  return api<{ id: string }>(`/projects`, {
    method: 'POST',
    body: {
      title: args.title,
      product_line: 'line_b_coding',
      kind: GAME_PROJECT_KIND,
      ...(args.template ? { template: args.template } : {}),
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

// ── Class shared asset library (class-shared-assets-prd) ─────────────────────
// A teacher prepares media assets on a class; a kid whose game project belongs
// to that class can browse them in the Asset Viewer's "Class" tab and pull a
// copy into their own VFS. The backend gates access: it returns `[]` unless the
// project is `class_work`/`class` for a class the kid is enrolled in — so the
// frontend simply hides the Class tab when the list is empty (server is the
// source of truth for authz, airbotix-app CLAUDE.md #4).

/**
 * A class-shared asset the kid can browse (backend `ClassAssetView`). The
 * endpoint now MERGES two sources into one flat list (D-CSA-3): the bound course
 * pack's admin-curated DEFAULTS (`source:'course'`, no `class_id`) come first,
 * then the class's own teacher assets (`source:'class'`). The kid consumes both
 * identically (the "Add to my game" copy-into-VFS flow is unchanged); `source`
 * only labels the origin in the UI.
 */
export interface ClassAssetView {
  id: string;
  /** Absent for course-pack defaults (they have no owning class). */
  class_id?: string;
  name: string;
  /**
   * Full parity with the playground's own importable set (D-3D-09 + data assets):
   * media plus 3D `model` (glb) and non-executable `other` data (game data, fonts,
   * shaders). A sprite strip arrives as an `image` item PLUS a sibling `other`-kind
   * item named `<image-basename>.anim.json` (the sidecar) in the same list — the UI
   * derives "sprite" from that pairing, never from a distinct backend kind.
   */
  kind: 'image' | 'audio' | 'video' | 'model' | 'other';
  mime_type: string;
  size_bytes: number;
  created_at: string;
  /** A short-lived signed GET URL — used only to PREVIEW and to COPY bytes into
   *  the VFS. It is NEVER referenced directly inside the sandboxed game (the game
   *  loads only VFS-resident assets, exactly like imports — playground CLAUDE.md
   *  security model). */
  download_url: string;
  /** Where this asset comes from — course-pack default vs class (teacher) asset. */
  source: 'class' | 'course';
}

/**
 * List the shared assets visible to this project (class-shared-assets-prd).
 * `GET /projects/:id/class-assets` MERGES the bound course pack's defaults
 * (`source:'course'`, first) and the class's teacher assets (`source:'class'`)
 * into one flat list (D-CSA-3). It returns `[]` unless the project is class work
 * for a class the kid is enrolled in — the backend gate is the source of truth,
 * so the caller hides the Class tab when the list is empty.
 */
export async function listClassAssets(projectId: string): Promise<ClassAssetView[]> {
  return api<ClassAssetView[]>(`/projects/${projectId}/class-assets`);
}

/**
 * Fetch a class asset's bytes from its short-lived signed `download_url` and
 * convert them to a `data:` URL — the uniform VFS shape for a binary asset (the
 * same representation imports use). Copying the bytes into the VFS (rather than
 * referencing the signed URL) keeps the game self-contained and the sandbox
 * intact: a signed S3 URL would expire and would mean the untrusted game holds a
 * live credential-bearing URL. SSRF/safety is moot — the URL is one the backend
 * itself just minted for this kid.
 */
export async function fetchAssetDataUrl(downloadUrl: string): Promise<string> {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Failed to download asset (${res.status})`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read asset bytes'));
    reader.readAsDataURL(blob);
  });
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
  // Demo mode: the bundled demo starter, no network (try-demo-mode-prd D-DEMO-02).
  if (demoProjectFiles) return demoProjectFiles();
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
