// Sharing / remix data layer for the Game Studio (learn-game-studio-prd.md
// §17.7 J7 interactive class wall · §17.8 J8 external share-link · §17.10 J10
// remix · D-GAME8 / D-GAME10). Typed against the canonical backend contract.
//
// ROUTE-MOCKED in tests: every call goes through the shared `api` client (or, for
// the PUBLIC play route, a bare unauthed fetch) so the e2e suite can `page.route`
// each endpoint and run offline. No LLM is ever touched here — sharing publishes a
// frozen, read-only VFS snapshot; the public page is the bare game canvas only.
//
// Canonical endpoints (PRD §12.1 / §17.8 / §17.10):
//   POST   /projects/:id/share        mint a share-link (parent approval gated)
//   GET    /projects/:id/share        the current share-link state (pending/active)
//   DELETE /share/:shareId            revoke a share-link (→ later GETs serve 410)
//   GET    /play/:shareId/files       PUBLIC, no-auth frozen VFS (410 if revoked/expired)
//   GET    /classes/:id/wall/games    playable class-wall snapshots
//   POST   /classes/:id/wall/games/:postId/claps   add an anonymous clap (capped)
//   POST   /projects {remix_of}       fork a wall snapshot into a new owned project

import { ApiError, api } from '@/lib/api';
import type { VfsFile } from '../code/codeApi';
import { GAME_PROJECT_KIND } from './panes/playgroundApi';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

// ── External share-link (J8 / D-GAME10) ────────────────────────────────────

/**
 * A share-link's lifecycle state. A mint REQUIRES parent approval (D-GAME10a),
 * so the first state a kid sees after asking is `pending` — no URL yet. Once the
 * parent approves and the frozen snapshot passes the safety + PII scan, the
 * backend mints a capability URL (`active`). Revoke/expiry → the public route
 * serves 410 (surfaced to a visitor as `ShareGoneError`).
 */
export type ShareStatus = 'none' | 'pending' | 'active' | 'revoked';

export interface ShareLink {
  status: ShareStatus;
  /** Present only when `active`: the unlisted capability URL path `/play/:shareId`. */
  shareId?: string;
  /** ISO timestamp the link auto-expires (→ 410). */
  expires_at?: string | null;
  /** Whether an anonymized display handle is shown to visitors (OD-7), vs none. */
  show_handle?: boolean;
}

/** Ask to mint a share-link. Returns `pending` until a parent approves (J8). */
export async function requestShareLink(projectId: string): Promise<ShareLink> {
  return api<ShareLink>(`/projects/${projectId}/share`, { method: 'POST' });
}

/** The current share-link state for a project (pending/active/none). */
export async function getShareLink(projectId: string): Promise<ShareLink> {
  try {
    return await api<ShareLink>(`/projects/${projectId}/share`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return { status: 'none' };
    throw e;
  }
}

/**
 * Toggle the anonymized display handle vs no author label on the public page
 * (OD-7 / §17.8). Never exposes kid PII either way — `show_handle` shows a chosen
 * display handle, not the real nickname/family/email.
 */
export async function setShareHandle(args: {
  projectId: string;
  showHandle: boolean;
}): Promise<ShareLink> {
  return api<ShareLink>(`/projects/${args.projectId}/share`, {
    method: 'PUT',
    body: { show_handle: args.showHandle },
  });
}

/** Revoke a share-link (kid OR parent). Subsequent public GETs serve 410. */
export async function revokeShareLink(shareId: string): Promise<void> {
  await api<void>(`/share/${shareId}`, { method: 'DELETE' });
}

/** The public play page got a 410 — the link was revoked or expired (J8). */
export class ShareGoneError extends Error {
  constructor() {
    super('share_gone');
    this.name = 'ShareGoneError';
  }
}

/**
 * Load a frozen, read-only VFS snapshot for the PUBLIC play page. Uses a BARE
 * `fetch` (NOT the `api` client) so NO auth token is sent — the public route
 * carries no auth and no `/llm/*` access (D-GAME10d). A revoked/expired link
 * returns 410 → `ShareGoneError` so the host can show the gone state.
 */
export async function readPublicSnapshot(shareId: string): Promise<VfsFile[]> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/play/${shareId}/files`, { method: 'GET' });
  } catch {
    throw new Error('network');
  }
  if (res.status === 410) throw new ShareGoneError();
  if (!res.ok) throw new Error(`play_${res.status}`);
  const body = (await res.json()) as { files?: VfsFile[] };
  return body.files ?? [];
}

// ── Interactive class wall (J7 / D-GAME8) ───────────────────────────────────

/**
 * A playable class-wall game: a published, read-only VFS snapshot rendered in the
 * opaque-origin sandbox (D-GAME8 — the wall never exposes an editable surface).
 * `claps` is the capped anonymous reaction count (OD-8): a number with no
 * identities, no messages, no comments.
 */
export interface WallGame {
  /** WallPost id (the clap/remix subject — NOT the project id). */
  postId: string;
  shareId: string;
  title: string;
  /** Anonymized author display handle (no PII), or null for anonymous. */
  handle: string | null;
  /** Capped anonymous clap count (OD-8 equity guard — shown capped, not ranked). */
  claps: number;
  /** Whether this kid already clapped (one clap per kid per post). */
  clapped: boolean;
  /** Whether the teacher enabled remix for this class (J10). */
  remix_enabled: boolean;
  /** Attribution shown when this game is itself a remix ("Remixed from …"). */
  remixed_from?: string | null;
}

/** The cap on the visible clap count (OD-8 equity guard — show "lots" past it). */
export const CLAP_CAP = 50;

/** Playable games shared to a class wall (J7). Degrades to empty offline. */
export async function getWallGames(classId: string): Promise<WallGame[]> {
  try {
    const res = await api<WallGame[] | { games: WallGame[] }>(`/classes/${classId}/wall/games`);
    return Array.isArray(res) ? res : (res.games ?? []);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) return [];
    throw e;
  }
}

/**
 * Add one anonymous clap to a wall game (OD-8). Capped server-side AND surfaced
 * capped client-side — one clap per kid per post; no identity is attached.
 */
export async function clapWallGame(args: { classId: string; postId: string }): Promise<void> {
  await api<void>(`/classes/${args.classId}/wall/games/${args.postId}/claps`, { method: 'POST' });
}

// ── Remix (J10) ─────────────────────────────────────────────────────────────

/**
 * Fork a class-wall game's frozen snapshot into a NEW project owned by the
 * remixer (J10). The backend checks class-wall membership + remix-allowed, copies
 * the snapshot into a new owned VFS prefix, and records `remix_of` + attribution;
 * the original is never modified. Returns the new project id to open the studio.
 */
export async function remixWallGame(args: {
  shareId: string;
  kidId: string | null;
  familyId: string | null;
}): Promise<{ id: string }> {
  return api<{ id: string }>(`/projects`, {
    method: 'POST',
    body: {
      product_line: 'line_b_coding',
      kind: GAME_PROJECT_KIND,
      remix_of: args.shareId,
      ...(args.kidId ? { kid_id: args.kidId } : {}),
      ...(args.familyId ? { family_id: args.familyId } : {}),
    },
  });
}
