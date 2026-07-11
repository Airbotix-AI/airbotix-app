// Code Studio data layer. Typed against learn-code-studio-prd.md §3/§4/§4.5
// (decision D-CODE1) + platform-backend-api-spec.md §5.7 (projects).
//
// Per D-CODE1 the agent loop runs SERVER-SIDE in `platform-backend/code-sessions`.
// This SPA is a THIN CLIENT: it never runs the LLM loop or parses code fences.
// It calls three public endpoints (D-CODE1d) and renders whatever the backend
// returns (changes / files / summary / plan). Every call uses the shared `api`
// client so auth + refresh + error envelopes behave identically to the rest of
// the app, and no LLM endpoint is ever hit directly (airbotix-app CLAUDE.md #5).

import { api, ApiError } from '@/lib/api';
import { surfacePrincipal, useAuthStore } from '@/auth/authStore';
import type { RunReport } from '../playground/runReport';

export const CODE_PROJECT_KIND = 'code' as const;

// Per-template seed prompt cost + first-build cost (PRD §3.3).
export const TEMPLATE_SEED_COST = 1;

export type CodeTemplateId = 'pet_website' | 'tiny_game' | 'doodle_pad' | 'beat_box' | 'blank';

export interface CodeTemplate {
  id: CodeTemplateId;
  emoji: string;
  title: string;
  desc: string;
  color: 'sky' | 'mint' | 'bubblegum' | 'sunshine' | 'coral';
}

export const CODE_TEMPLATES: CodeTemplate[] = [
  { id: 'pet_website', emoji: '🌐', title: 'My Pet Website', desc: 'A page all about your pet (real or made up).', color: 'sky' },
  { id: 'tiny_game', emoji: '🎮', title: 'Creative Code Studio', desc: 'A click-or-catch game you can keep adding to.', color: 'mint' },
  { id: 'doodle_pad', emoji: '✏️', title: 'Doodle Pad', desc: 'Draw with your mouse and pick colours.', color: 'bubblegum' },
  { id: 'beat_box', emoji: '🎵', title: 'Beat Box', desc: 'Tap buttons to make beats and sounds.', color: 'sunshine' },
  { id: 'blank', emoji: '✨', title: 'Blank Project', desc: 'Start from scratch and tell the AI your idea.', color: 'coral' },
];

// ── Virtual FS file model (PRD §3.2) ───────────────────────────────────────

export interface VfsFile {
  path: string; // project-relative, e.g. 'index.html' or 'images/cat.png'
  content: string; // text content, or a data: URL for binary assets
  kind: 'text' | 'asset';
  size: number;
}

export interface CodeProject {
  id: string;
  title: string;
  kind: typeof CODE_PROJECT_KIND;
  visibility: 'private' | 'class' | 'public';
  updated_at: string;
  created_at: string;
  /** The teacher's "where we left off" (D-PAP-19,22); present on resumed games. */
  learning_context?: LearningContext | null;
  /**
   * Game engine for kind='game' projects (learn-game-studio-3d-prd.md D-3D-01):
   * 'phaser' (2D) | 'three' (3D). Absent/null on non-game projects and on games
   * created before 3D — treat absent as 'phaser'.
   */
  engine?: 'phaser' | 'three' | null;
}

// ── Agent turn model (PRD §4 / §4.5 — server-side loop) ────────────────────

export type ToolName = 'read_file' | 'write_file' | 'edit_file' | 'list_dir';

export interface AgentPlan {
  plan_text: string;
  planned_tools: Array<{ tool: ToolName; path?: string }>;
}

export interface FileChange {
  path: string;
  before: string;
  after: string;
  lines_added: number;
  lines_removed: number;
}

// A region-correct crisis resource (helpline) the backend binds to the family /
// school enrolment record — NEVER improvised client-side (learn-game-studio-prd
// §11g / J13). Shown standing on the distress rescue path.
export interface CrisisResource {
  /** Helpline / service name, e.g. "Kids Helpline". */
  name: string;
  /** Dialable number, e.g. "1800 55 1800". */
  phone: string;
  /** One short, kid-readable line about who to call and why. */
  note?: string;
}

// The server-side safeguarding verdict (learn-game-studio-prd §11g / J13). When
// present on a turn result, the input firewall + intent classifier ran BEFORE any
// LLM call and decided NOT to run a game turn — the studio must render the
// deflection (and, for distress, the standing crisis resource) and must NOT apply
// files, stream a turn, or charge Stars. The classifier never closes the loop
// alone; the backend has already logged the safeguarding audit event + escalation.
export interface SafeguardingVerdict {
  // `personal-disclosure` → gentle deflect + log, no escalation. `distress`
  // (self-harm-adjacent) → recall-favouring: standing crisis resource + sticky
  // safe-mode (the resource persists; re-disclosure escalates a tier) + escalate.
  class: 'personal-disclosure' | 'distress';
  // The standing, kid-readable deflection — the backend's wording, never improvised
  // client-side. The agent "breaks character" and routes to a trusted grown-up.
  message: string;
  // Present for `distress`: the region-correct standing crisis resource.
  crisisResource?: CrisisResource;
}

// A workspace action the backend agent asks the Game Studio UI to perform. The
// agent uses these to DIRECT THE CHILD'S ATTENTION to what it just did — open the
// changed file, highlight the new lines, run the game — or jump the kid to a Game
// Guide passage (playground-ai-prompt-prd.md D-PAP-08, App. A). Executed
// client-side by executeClientActions (forward-compatible: unknown actions ignored).
export type ClientActionName =
  // A · Show & teach
  | 'run_game'
  | 'restart_game'
  | 'show_code'
  | 'focus_panel'
  | 'open_file'
  | 'highlight_code'
  | 'jump_to_line'
  | 'show_console'
  | 'physics_debug'
  | 'set_screen_size'
  | 'show_button'
  // B · Windows & look
  | 'open_window'
  | 'close_window'
  | 'minimize_window'
  | 'maximize_window'
  | 'restore_window'
  | 'move_window'
  | 'resize_window'
  | 'set_theme'
  | 'set_layout'
  // C · Navigate / search / history
  | 'search'
  | 'replace_all'
  | 'set_sidebar'
  | 'open_history'
  | 'open_diff'
  | 'revert_to'
  // D · Assets
  | 'open_asset_viewer'
  | 'select_asset'
  | 'generate_asset'
  | 'copy_loader'
  // Game Guide
  | 'open_help';

export interface ClientAction {
  action: ClientActionName;
  /** Pane for show_code / focus_panel; window id for the window ops; the Guide docId for open_help. */
  target?: string;
  /** open_help → the heading anchor within the doc to scroll to. */
  anchor?: string;
  /** show_button text. */
  label?: string;
  /** File path for open_file / highlight_code / jump_to_line / open_diff / select_asset. */
  path?: string;
  /** highlight_code: inclusive line range. */
  fromLine?: number;
  toLine?: number;
  /** jump_to_line target line. */
  line?: number;
  /** Single-enum param: show_console open|close, physics_debug on|off, set_theme light|dark, etc. */
  mode?: string;
  /** search query. */
  query?: string;
  /** replace_all find/replace. */
  find?: string;
  replace?: string;
  /** generate_asset prompt. */
  prompt?: string;
  /** revert_to checkpoint id. */
  checkpoint?: string;
  /** move_window / resize_window geometry. */
  rect?: { x?: number; y?: number; w?: number; h?: number };
}

export interface AgentTurnResult {
  // Backend-issued id for the turn — used to approve/reject a staged plan.
  turn_id: string;
  // True when the turn produced a plan that must be approved before its writes
  // are persisted (Pro multi-file gate, PRD §4.1 / D-CODE1c).
  requires_approval: boolean;
  plan: AgentPlan | null;
  changes: FileChange[];
  // Full VFS after the turn (or after the plan would be applied) so the preview
  // can re-render deterministically without a second round-trip.
  files: VfsFile[];
  // The project's server VFS version AFTER this turn's writes (PRD J3). An applied
  // turn bumps `vfs_version` server-side, so the studio MUST adopt this as the base
  // for its next manual save — otherwise that save sends a stale expected_version,
  // 409s, and the kid's hand-edit is reverted ("we kept your newest copy").
  version: number;
  summary: string;
  stars_charged: number;
  tools_fired: string[];
  // Set when the safeguarding classifier deflected this message instead of running
  // a game turn (J13). When present, NO files/Stars/stream — render the rescue UI.
  safeguarding?: SafeguardingVerdict;
  // Workspace actions for the Game Studio to execute after the turn applies
  // (run/restart the game, focus a pane…). See executeClientActions.
  client_actions?: ClientAction[];
  // The teacher's "what shall we do next?" options (playground §11.4 / D-PAP-06),
  // rendered as tappable chips; tapping one sends `prompt` as the next turn.
  next_steps?: NextStep[];
  // Per-file "what changed" notes (playground §11.4) — one clickable row per file.
  file_notes?: FileNote[];
  // A short, kid-readable label for the history timeline (null/absent if none).
  history_label?: string | null;
  // The teacher's updated "where we left off" (playground §11 / D-PAP-19,22),
  // persisted on the project and used for the resume recap.
  learning_context?: LearningContext | null;
  // Post-apply verification (D-PAP-40): 'pending' = this applied game turn is
  // awaiting a run report — the studio runs the game instrumented and POSTs a
  // RunReport for it (see useVerification). 'none' = never verifiable (no file
  // changes / not a game). Optional: absent on older backends ⇒ treat as 'none'.
  verification?: 'pending' | 'none';
}

/** One next-step option the teacher offers on `done` (rendered as a chip). */
export interface NextStep {
  /** Kid-facing button text, e.g. "Add jumping 🦘". */
  label: string;
  /** The prompt this option sends as the next turn. */
  prompt: string;
  /** Whether this option teaches a concept or is just for fun. */
  tag: 'concept' | 'fun';
}

/** A per-file "what changed" note (playground §11.4) — a clickable row in the chat. */
export interface FileNote {
  path: string;
  note: string;
}

/** The teacher's lightweight "where we left off", shown as a recap on resume. */
export interface LearningContext {
  summary: string;
  concepts?: string[];
  next?: string;
}

// ── Project endpoints ──────────────────────────────────────────────────────

export async function listProjects(kidId: string): Promise<CodeProject[]> {
  const all = await api<Array<CodeProject & { kind?: string }>>(
    `/kids/${kidId}/projects?kind=${CODE_PROJECT_KIND}`,
  );
  return all.filter((p) => p.kind === CODE_PROJECT_KIND).map((p) => ({ ...p, kind: CODE_PROJECT_KIND }));
}

export async function createCodeProject(args: {
  kidId: string | null;
  familyId: string | null;
  title: string;
  template: CodeTemplateId;
  /** Set when the project backs a Mission `widget: code` step (PRD §7). */
  missionId?: string;
}): Promise<{ id: string }> {
  return api<{ id: string }>(`/projects`, {
    method: 'POST',
    body: {
      title: args.title,
      product_line: 'line_b_coding',
      kind: CODE_PROJECT_KIND,
      template: args.template,
      ...(args.missionId ? { mission_id: args.missionId } : {}),
      ...(args.kidId ? { kid_id: args.kidId } : {}),
      ...(args.familyId ? { family_id: args.familyId } : {}),
    },
  });
}

/**
 * Submit a Mission-linked project for the acceptance gate (learn-missions-prd
 * §3.4). The backend re-reads `Mission.acceptance` and the project's final VFS
 * (code-studio-prd §7) — client cannot lie about completion. On pass the
 * Project flips to `accepted` and completion ⭐ are credited.
 */
export interface MissionSubmitResult {
  status: 'accepted' | 'incomplete';
  /** Acceptance criteria not yet met (e.g. ['index.html', 'a <button>']). */
  missing?: string[];
  reason?: string;
  stars_awarded?: number;
}

export async function submitMission(args: {
  projectId: string;
  missionId: string;
}): Promise<MissionSubmitResult> {
  return api<MissionSubmitResult>(`/projects/${args.projectId}/submit`, {
    method: 'POST',
    body: { mission_id: args.missionId },
  });
}

export async function getProject(projectId: string): Promise<CodeProject> {
  return api<CodeProject>(`/projects/${projectId}`);
}

/**
 * Set a game project's engine (learn-game-studio-3d-prd.md D-3D-08) — the
 * backend half of a kid-confirmed 2D⇄3D switch. PATCH /projects/:id { engine };
 * the caller then re-runs the agent to rebuild the game in the new engine.
 */
export async function setProjectEngine(args: {
  projectId: string;
  engine: 'phaser' | 'three';
}): Promise<void> {
  await api(`/projects/${args.projectId}`, { method: 'PATCH', body: { engine: args.engine } });
}

// ── Asset content representation (studio data: URL ↔ backend raw base64) ─────
// The backend stores/returns BINARY asset bytes as raw base64 (no prefix) and
// decodes save payloads with `Buffer.from(content, 'base64')`. The studio VFS
// represents an asset's `content` as a `data:` URL (so <img src>/Phaser load it
// directly). Convert at the API boundary, or the round-trip mangles the bytes
// (the `data:…;base64,` prefix's `:`/`;`/`,` corrupt the base64 decode). SVG is
// backend-text → its data: URL round-trips verbatim, so it needs no conversion.
const BINARY_ASSET_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  // Non-executable DATA assets a kid can import (game data, fonts, shaders). They
  // round-trip as `data:` URLs like binary assets — the backend returns them as
  // base64 (kind:'asset') and the runtime inlines them. Mirror the backend
  // DATA_ASSET_EXTENSIONS. NOTE: `.anim.json` is a TEXT sidecar (backend keeps it
  // text), so `binaryAssetMime` matching `json` here never applies to it.
  json: 'application/json',
  xml: 'application/xml',
  csv: 'text/csv',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  fnt: 'application/octet-stream',
  glsl: 'text/plain',
  frag: 'text/plain',
  vert: 'text/plain',
  atlas: 'text/plain',
  // 3D model (binary glTF, D-3D-09) — round-trips like any other binary asset.
  glb: 'model/gltf-binary',
};
function binaryAssetMime(path: string): string | undefined {
  return BINARY_ASSET_MIME[path.split('.').pop()?.toLowerCase() ?? ''];
}
/** Backend raw base64 → studio `data:` URL (assets only). */
function toStudioContent(f: VfsFile): VfsFile {
  // Only ASSETS get the data: URL treatment — the backend `kind` is authoritative.
  // This guards TEXT files whose extension also appears in BINARY_ASSET_MIME (e.g.
  // a `.anim.json` sidecar is text, not a data asset) from being wrongly wrapped.
  if (f.kind !== 'asset') return f;
  const mime = binaryAssetMime(f.path);
  if (!mime || f.content.startsWith('data:')) return f;
  return { ...f, content: `data:${mime};base64,${f.content}` };
}
// Studio asset `data:` URLs no longer go inline in the save — `saveVfs` uploads
// their bytes straight to S3 and sends a reference. `toBackendContent` (the old
// data-URL→base64 stripper) is gone with it; `toStudioContent` still wraps the
// base64 the GET returns back into a `data:` URL for the runtime.

/**
 * Normalize a turn result's `files` into studio form (asset base64 → `data:` URL).
 * A turn result carries the FULL post-turn VFS (`readAllFiles`), and the backend
 * returns binary assets as RAW base64 — exactly like the snapshot/save reads, which
 * already `map(toStudioContent)`. The turn-result paths must do the same, or an
 * imported asset (image / audio / `.glb`) that rides along in the VFS lands in the
 * studio store as bare base64 and can't render ("Couldn't open this 3D model"). The
 * clearest place this bites is the 2D→3D engine switch: its rebuild turn re-applies
 * the whole VFS, so a just-preserved model would show as damaged until a reload.
 * `changes[].after` is intentionally NOT touched — the diff view expects raw base64.
 */
function toStudioTurnResult(r: AgentTurnResult): AgentTurnResult {
  return { ...r, files: (r.files ?? []).map(toStudioContent) };
}

/** Decode a studio asset `data:` URL → Blob (for a direct browser→S3 PUT, or a
 *  `blob:` object URL so the DOM can render large assets — see `useObjectUrl`). */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const mime = dataUrl.slice(5, comma).split(';')[0] || 'application/octet-stream';
  const bin = atob(dataUrl.slice(comma + 1));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/**
 * A presigned S3 upload, as returned by every `sign-upload` endpoint (asset save
 * AND chat-image input). The browser PUTs the bytes straight to `url` (the
 * signature IS the auth — no bearer token to S3), then references `s3_key`.
 */
export interface SignedUpload {
  url: string;
  /** Always a PUT for our presigned uploads; present so the caller never guesses. */
  method?: 'PUT';
  headers?: Record<string, string>;
  /** Seconds the URL stays valid (informational; the PUT must beat it). */
  expires_in?: number;
  s3_key: string;
}

/**
 * PUT a blob straight to a presigned S3 URL (shared by `uploadAssetToS3` and the
 * chat-image upload). The presigned URL is absolute + self-authorising, so this is
 * a RAW fetch — never the `api` client (which would attach our bearer token to
 * S3). Throws an `ApiError` on a non-2xx so the caller can surface it.
 */
async function putToSignedUrl(signed: SignedUpload, blob: Blob, what: string): Promise<void> {
  const res = await fetch(signed.url, {
    method: 'PUT',
    headers: signed.headers ?? { 'Content-Type': blob.type },
    body: blob,
  });
  if (!res.ok) {
    throw new ApiError(res.status, 'UPLOAD_FAILED', `Couldn't upload ${what} (${res.status}).`);
  }
}

/**
 * Upload one asset's bytes STRAIGHT to S3 via a presigned PUT, so they never go
 * through nginx (1 MB cap) or the JSON save. The save then references it
 * (`uploaded:true`). Throws an `ApiError` on failure so the save reports it.
 */
async function uploadAssetToS3(projectId: string, file: VfsFile): Promise<void> {
  const blob = dataUrlToBlob(file.content);
  const signed = await api<SignedUpload>(`/projects/${projectId}/vfs/assets/sign-upload`, {
    method: 'POST',
    body: { path: file.path, content_type: blob.type, size_bytes: blob.size },
  });
  await putToSignedUrl(signed, blob, file.path);
}

// ── Chat-input images (playground-ai-prompt-prd.md D-PAP-33..37) ───────────
// A kid can attach pictures to a chat turn so the agent "sees" them. The bytes
// go STRAIGHT to S3 via a presigned PUT (chat-input prefix, OUTSIDE the project
// VFS — these are turn context, not project assets); the turn body then carries
// only `{ s3_key, mime }`. Mandatory pre-model moderation is enforced server-side
// (fail-closed); the client guards below are UX-only first-line checks. The kid
// NEVER calls an LLM directly (CLAUDE.md #5).

/** The allow-listed image MIME types (mirror the backend `CodeTurnSchema`). */
export const CHAT_IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export type ChatImageMime = (typeof CHAT_IMAGE_MIMES)[number];
/** Max bytes per attached image (mirror the backend presign bound — 5 MB). */
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** Max images per message (mirror the backend `images` max). */
export const CHAT_IMAGE_MAX_COUNT = 4;
/** Optional client downscale target — longest edge, in px. */
const CHAT_IMAGE_MAX_EDGE = 1536;

/** A reference to an uploaded chat-input image — what a turn body carries. */
export interface ChatImageRef {
  s3_key: string;
  mime: ChatImageMime;
}

/** True when `mime` is an allow-listed chat-image type (narrow + guard). */
export function isChatImageMime(mime: string): mime is ChatImageMime {
  return (CHAT_IMAGE_MIMES as readonly string[]).includes(mime);
}

/**
 * Presign a chat-input image upload (POST /projects/:id/code/chat-image/sign-upload).
 * The backend generates the (kid-uninfluenceable) `chat-input/<projectId>/<uuid>`
 * key and returns the same {@link SignedUpload} shape the asset save uses.
 */
export async function signChatImageUpload(
  projectId: string,
  args: { contentType: ChatImageMime; sizeBytes: number },
): Promise<SignedUpload> {
  return api<SignedUpload>(`/projects/${projectId}/code/chat-image/sign-upload`, {
    method: 'POST',
    body: { content_type: args.contentType, size_bytes: args.sizeBytes },
  });
}

/**
 * Optionally downscale an image blob so its longest edge is ≤ {@link CHAT_IMAGE_MAX_EDGE}px,
 * re-encoding to the same MIME. Smaller-or-equal images (and any encode/canvas
 * failure, or a GIF — re-encoding would drop its animation) are returned verbatim,
 * so this NEVER blocks an upload; it just trims bandwidth + token cost when it can.
 */
async function downscaleImage(blob: Blob, mime: ChatImageMime): Promise<Blob> {
  // GIFs are passed through (canvas re-encode would flatten the animation), and a
  // missing DOM (test/SSR) means no canvas — keep the original bytes either way.
  if (mime === 'image/gif' || typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
    return blob;
  }
  try {
    const bitmap = await createImageBitmap(blob);
    const longest = Math.max(bitmap.width, bitmap.height);
    if (longest <= CHAT_IMAGE_MAX_EDGE) {
      bitmap.close?.();
      return blob;
    }
    const scale = CHAT_IMAGE_MAX_EDGE / longest;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime));
    return out ?? blob;
  } catch {
    return blob; // any decode/encode failure → upload the original
  }
}

/**
 * Validate + (optionally) downscale + upload one chat-input image, returning the
 * {@link ChatImageRef} the turn body carries. Throws an `ApiError` with a kid-safe
 * code on a client-guard miss (bad MIME / oversize) BEFORE any network call, and
 * propagates a presign / S3 PUT failure as an `ApiError` so the caller can show a
 * friendly "couldn't add that picture" state.
 */
export async function uploadChatImage(projectId: string, file: File | Blob): Promise<ChatImageRef> {
  const mime = file.type;
  if (!isChatImageMime(mime)) {
    throw new ApiError(415, 'IMAGE_TYPE_UNSUPPORTED', "That kind of picture isn't supported.");
  }
  if (file.size > CHAT_IMAGE_MAX_BYTES) {
    throw new ApiError(413, 'IMAGE_TOO_LARGE', 'That picture is too big (max 5 MB).');
  }
  const blob = await downscaleImage(file, mime);
  const signed = await signChatImageUpload(projectId, { contentType: mime, sizeBytes: blob.size });
  await putToSignedUrl(signed, blob, 'your picture');
  return { s3_key: signed.s3_key, mime };
}

// ── VFS read (D-CODE1d: GET /projects/:id/code/files) ──────────────────────

/**
 * A versioned VFS snapshot. `version` is the server's monotonic save counter
 * (bumped on every write); the client echoes it back on save so the backend can
 * detect a stale write (last-write-wins reconcile, PRD §6 D-GAME3 / J3).
 */
export interface VfsSnapshot {
  files: VfsFile[];
  version: number;
}

/**
 * Read the project's virtual FS. The backend seeds starter template files into
 * the VFS at project create (D-CODE1d), so this endpoint is the single source
 * of truth — there is no local starter fallback. Used for initial load + the
 * iframe preview.
 */
export async function readVfs(projectId: string): Promise<VfsFile[]> {
  return (await readVfsSnapshot(projectId)).files;
}

/**
 * Read the project's VFS WITH its server version (PRD J3). The save flow needs
 * the version to PUT a non-stale write; `version` defaults to 0 if the backend
 * omits it (older projects / not-yet-saved), which still reconciles correctly.
 */
export async function readVfsSnapshot(projectId: string): Promise<VfsSnapshot> {
  const res = await api<{ files?: VfsFile[]; version?: number }>(`/projects/${projectId}/code/files`);
  return { files: (res.files ?? []).map(toStudioContent), version: res.version ?? 0 };
}

// ── VFS save / write-back (D-GAME3b: PUT /projects/:id/code/files) ──────────

/** A stale-version save (PRD J3): the backend rejected our `version` (409). */
export class SaveConflictError extends Error {
  constructor(public readonly current: VfsSnapshot) {
    super('save_conflict');
    this.name = 'SaveConflictError';
  }
}

/**
 * Persist the project's VFS server-side (PRD §6 D-GAME3b / J3). Sends the files
 * + the `version` we last loaded; the backend writes atomically and returns the
 * bumped version. A stale `version` (another tab/device saved first) yields a
 * `409` carrying the server's current snapshot — surfaced as `SaveConflictError`
 * so the caller can reconcile last-write-wins (server wins, keep the newest copy
 * recoverable in History). `idempotency_key` makes a network retry safe.
 */
export async function saveVfs(args: {
  projectId: string;
  files: VfsFile[];
  version: number;
  idempotencyKey?: string;
  /**
   * Asset paths whose bytes are NOT yet in S3 at that path (newly imported /
   * renamed). Each is uploaded straight to S3 before the save; the rest are
   * already there (loaded or previously saved) and are sent as references.
   */
  dirtyAssetPaths?: Set<string>;
}): Promise<VfsSnapshot> {
  // 1) Upload dirty asset bytes directly to S3 (bypassing nginx + the JSON body).
  const dirty = args.dirtyAssetPaths ?? new Set<string>();
  for (const f of args.files) {
    if (f.kind === 'asset' && dirty.has(f.path) && f.content.startsWith('data:')) {
      await uploadAssetToS3(args.projectId, f);
    }
  }
  // 2) Save the manifest: text inline (stays server-scanned), assets as references.
  const body = args.files.map((f) =>
    f.kind === 'asset' ? { path: f.path, uploaded: true } : { path: f.path, content: f.content },
  );
  try {
    const res = await api<{ files?: VfsFile[]; version: number }>(
      `/projects/${args.projectId}/code/files`,
      {
        method: 'PUT',
        body: {
          files: body,
          // Backend DTO field is `expected_version` (optimistic concurrency); a
          // plain `version` is dropped → validation 400 → every save fell back to
          // "Saved on this device" (queued) and never synced.
          expected_version: args.version,
          idempotency_key: args.idempotencyKey ?? crypto.randomUUID(),
        },
      },
    );
    return { files: res.files ? res.files.map(toStudioContent) : args.files, version: res.version };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const current = (e.details ?? {}) as { files?: VfsFile[]; version?: number };
      throw new SaveConflictError({
        files: (current.files ?? []).map(toStudioContent),
        version: current.version ?? args.version,
      });
    }
    throw e;
  }
}

// ── Agent turn (D-CODE1d: POST /projects/:id/code/turn) ────────────────────

/**
 * Run one agent turn. The backend runs the full agentic loop (DeepRouter +
 * tool dispatch), validates tool calls, debits Stars, and returns the updated
 * VFS + a structured diff + (in Pro multi-file flows) a plan awaiting approval.
 * The SPA renders the response; it does not run the loop or parse fences.
 *
 * `idempotency_key` makes retries safe — the backend dedupes turns by key so a
 * network retry never double-charges Stars or double-applies writes.
 */
export async function runAgentTurn(args: {
  projectId: string;
  prompt: string;
  mode: 'lite' | 'pro';
  idempotencyKey?: string;
  piiWarnAcknowledged?: boolean;
  /** The kid tapped a next-step chip — keep the guided chip→chip loop going (D-PAP-26). */
  guided?: boolean;
  /** Attached input images (D-PAP-33) — sent ONLY when non-empty. */
  images?: ChatImageRef[];
  /** Abort the in-flight turn (kid "Stop waiting", D-PAP-48) — the disconnect is a
   *  clean server-side cancel (no Stars). Aborting rejects with an AbortError. */
  signal?: AbortSignal;
}): Promise<AgentTurnResult> {
  const res = await api<AgentTurnResult>(`/projects/${args.projectId}/code/turn`, {
    method: 'POST',
    signal: args.signal,
    body: {
      prompt: args.prompt,
      mode: args.mode,
      idempotency_key: args.idempotencyKey ?? crypto.randomUUID(),
      ...(args.piiWarnAcknowledged ? { pii_warn_acknowledged: true } : {}),
      ...(args.guided ? { guided: true } : {}),
      ...(args.images && args.images.length > 0 ? { images: args.images } : {}),
    },
  });
  return toStudioTurnResult(res);
}

/**
 * Self-verify auto-fix (playground-ai-prompt-prd.md MP3 / D-PAP-09,13,23). After
 * the studio runs a freshly-applied game and the sandbox captures console errors,
 * it reports them so the backend can run a bounded fix turn — or, once attempts are
 * exhausted, hand off to "let's debug together" (`co_debug`).
 */
export interface VerifyFixResult {
  /** True when a fix turn ran; false on the co-debug / nothing-to-fix hand-off. */
  attempted: boolean;
  /** True once auto-fix is exhausted — show the "let's debug together" UI. */
  co_debug: boolean;
  /** The attempt number consumed (1-based). */
  attempt: number;
  /** The fix turn (present when attempted). */
  turn?: AgentTurnResult;
  /** A kid-facing message for the co-debug hand-off (present when co_debug). */
  message?: string;
}

/**
 * Report the runtime errors the sandbox captured running a just-applied game, so
 * the backend auto-fixes them (≤2 attempts) or hands off to co-debug. `attempt` is
 * 1-based and increments each FE→BE round-trip for the same broken game.
 */
export async function reportRuntimeErrors(args: {
  projectId: string;
  errors: string[];
  attempt: number;
  mode: 'lite' | 'pro';
  idempotencyKey?: string;
}): Promise<VerifyFixResult> {
  const res = await api<VerifyFixResult>(`/projects/${args.projectId}/code/verify-fix`, {
    method: 'POST',
    body: {
      errors: args.errors,
      attempt: args.attempt,
      mode: args.mode,
      idempotency_key: args.idempotencyKey ?? crypto.randomUUID(),
    },
  });
  // The fix turn (when present) carries the full post-turn VFS too — normalize its
  // assets to studio `data:` URLs like every other turn-result path.
  return res.turn ? { ...res, turn: toStudioTurnResult(res.turn) } : res;
}

// ── Post-apply verification (D-PAP-40/41: POST …/turn/:turnId/run-report) ───

/**
 * The server's answer to a posted RunReport (mirror the backend
 * `RunReportVerdict`). `recorded` = intake-only (log mode) — do nothing;
 * `verified` = clean run; `fixing` = a fix turn ran — apply its files silently,
 * run again, report `attempt + 1`; `co_debug` = attempts exhausted — surface
 * `message` as ONE warm chat bubble (the only visible surface of the loop);
 * `inconclusive` = no evidence either way (probe failure / nothing pending).
 */
export type RunReportVerdict =
  | { verdict: 'recorded' }
  | { verdict: 'verified' }
  | { verdict: 'fixing'; attempt: number; turn: AgentTurnResult }
  | { verdict: 'co_debug'; message: string }
  | { verdict: 'inconclusive' };

/**
 * Report what ACTUALLY happened when the studio ran an applied turn's game
 * instrumented (the RunReport built by `playground/runReport`). The backend
 * adjudicates: silent on success and on auto-fix; only co-debug surfaces.
 */
export async function postRunReport(args: {
  projectId: string;
  turnId: string;
  report: RunReport;
  mode: 'lite' | 'pro';
}): Promise<RunReportVerdict> {
  const res = await api<RunReportVerdict>(
    `/projects/${args.projectId}/code/turn/${args.turnId}/run-report`,
    {
      method: 'POST',
      body: { ...args.report, mode: args.mode },
    },
  );
  // A fix turn carries the full post-turn VFS — normalize its assets to studio
  // `data:` URLs like every other turn-result path.
  return res.verdict === 'fixing' ? { ...res, turn: toStudioTurnResult(res.turn) } : res;
}

/** The newest applied turn's verification state (GET …/code/verify-state). */
export interface VerifyState {
  turn_id: string | null;
  verify_status: 'none' | 'pending' | 'verified' | 'failed_fixed' | 'failed_codebug' | 'expired';
  attempts: number;
}

/**
 * Resume-verify (D-PAP-40): on project open, a `pending` state means the last
 * applied turn was never verified (closed tab) — run the game and report
 * `attempts + 1`.
 */
export async function getVerifyState(projectId: string): Promise<VerifyState> {
  return api<VerifyState>(`/projects/${projectId}/code/verify-state`);
}

/** Live progress from a streaming turn (SSE) — what the agent is doing right now. */
export type TurnEvent =
  | { type: 'file'; path: string }
  | { type: 'action'; action: string }
  | { type: 'summary'; text: string };

const STREAM_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

/**
 * Streaming agent turn (SSE, POST /projects/:id/code/turn/stream). Calls
 * `onEvent` for each live progress event while the agent works, then resolves
 * with the final AgentTurnResult — used by the streaming loading screen.
 */
export async function streamAgentTurn(
  args: { projectId: string; prompt: string; mode: 'lite' | 'pro'; images?: ChatImageRef[] },
  onEvent: (e: TurnEvent) => void,
): Promise<AgentTurnResult> {
  const token = useAuthStore.getState().tokens[surfacePrincipal()];
  const res = await fetch(`${STREAM_BASE}/projects/${args.projectId}/code/turn/stream`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({
      prompt: args.prompt,
      mode: args.mode,
      idempotency_key: crypto.randomUUID(),
      ...(args.images && args.images.length > 0 ? { images: args.images } : {}),
    }),
  });
  if (!res.ok || !res.body) {
    throw new ApiError(res.status, 'TURN_FAILED', 'Could not start the build.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let result: AgentTurnResult | null = null;
  let failure: { code: string; message: string } | null = null;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    // SSE frames are separated by a blank line.
    while ((nl = buf.indexOf('\n\n')) !== -1) {
      const frame = buf.slice(0, nl);
      buf = buf.slice(nl + 2);
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      let evt: { type: string; [k: string]: unknown };
      try {
        evt = JSON.parse(line.slice(5).trim());
      } catch {
        continue;
      }
      if (evt.type === 'done') result = evt.result as AgentTurnResult;
      else if (evt.type === 'error')
        failure = { code: String(evt.code), message: String(evt.message) };
      else onEvent(evt as TurnEvent);
    }
  }

  if (failure) throw new ApiError(400, failure.code, failure.message);
  if (!result) throw new ApiError(500, 'TURN_FAILED', 'The build did not finish.');
  return toStudioTurnResult(result);
}

// ── Safeguarding classify (J13 / §11g: POST …/code/turn/classify) ───────────

/**
 * Ask the backend to classify a chat message BEFORE any LLM call (the J13 input
 * firewall + intent classifier). Returns a {@link SafeguardingVerdict} only when
 * the message is deflected (personal-disclosure / distress) — `null` means it's a
 * normal game request and the caller may proceed to a turn. The classifier runs
 * server-side and never spends Stars; the backend logs the safeguarding audit
 * event + escalation. The kid NEVER calls an LLM directly (CLAUDE.md #5).
 */
export type AssetIntent = 'asset' | 'code';
export interface ClassifyResult {
  safeguarding: SafeguardingVerdict | null;
  /** Route a typed chat message: an ASSET request vs a game-CODE change (§3). */
  intent: AssetIntent;
}

export async function classifyMessage(args: {
  projectId: string;
  prompt: string;
  /** Abort the in-flight classify (kid "Stop waiting", D-PAP-48). Aborting rejects
   *  with an AbortError; the caller treats it as a clean cancel. */
  signal?: AbortSignal;
}): Promise<ClassifyResult> {
  const res = await api<{ safeguarding: SafeguardingVerdict | null; intent?: AssetIntent }>(
    `/projects/${args.projectId}/code/turn/classify`,
    { method: 'POST', body: { prompt: args.prompt }, signal: args.signal },
  );
  return { safeguarding: res.safeguarding, intent: res.intent ?? 'code' };
}

// ── Raise hand: "Ask my teacher" (J4) ───────────────────────────────────────

/**
 * Raise a hand to the teacher's live view (J4) — a lightweight, always-safe
 * signal that the kid wants help. No LLM, no Stars; the calm waiting state in the
 * studio never depends on this resolving.
 */
export async function raiseHand(args: { projectId: string }): Promise<void> {
  await api<void>(`/projects/${args.projectId}/raise-hand`, { method: 'POST', body: {} });
}

// ── Plan approve/reject (D-CODE1d: POST …/code/turn/:turnId/approve) ────────

/**
 * Resolve a staged plan. `approve` persists the turn's writes atomically and
 * debits Stars once (D-CODE1c); `reject` discards them. Returns the same turn
 * shape with updated files/changes/stars so the caller can render the result.
 */
export async function approveTurn(args: {
  projectId: string;
  turnId: string;
  decision: 'approve' | 'reject';
}): Promise<AgentTurnResult> {
  const res = await api<AgentTurnResult>(
    `/projects/${args.projectId}/code/turn/${args.turnId}/approve`,
    {
      method: 'POST',
      body: { decision: args.decision },
    },
  );
  return toStudioTurnResult(res);
}
