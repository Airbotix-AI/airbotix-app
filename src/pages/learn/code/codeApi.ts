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
  { id: 'tiny_game', emoji: '🎮', title: 'Tiny Game', desc: 'A click-or-catch game you can keep adding to.', color: 'mint' },
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
  // A short, kid-readable label for the history timeline (null/absent if none).
  history_label?: string | null;
  // The teacher's updated "where we left off" (playground §11 / D-PAP-19,22),
  // persisted on the project and used for the resume recap.
  learning_context?: LearningContext | null;
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
  return { files: res.files ?? [], version: res.version ?? 0 };
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
}): Promise<VfsSnapshot> {
  try {
    const res = await api<{ files?: VfsFile[]; version: number }>(
      `/projects/${args.projectId}/code/files`,
      {
        method: 'PUT',
        body: {
          files: args.files,
          // Backend DTO field is `expected_version` (optimistic concurrency); a
          // plain `version` is dropped → validation 400 → every save fell back to
          // "Saved on this device" (queued) and never synced.
          expected_version: args.version,
          idempotency_key: args.idempotencyKey ?? crypto.randomUUID(),
        },
      },
    );
    return { files: res.files ?? args.files, version: res.version };
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      const current = (e.details ?? {}) as { files?: VfsFile[]; version?: number };
      throw new SaveConflictError({ files: current.files ?? [], version: current.version ?? args.version });
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
}): Promise<AgentTurnResult> {
  return api<AgentTurnResult>(`/projects/${args.projectId}/code/turn`, {
    method: 'POST',
    body: {
      prompt: args.prompt,
      mode: args.mode,
      idempotency_key: args.idempotencyKey ?? crypto.randomUUID(),
    },
  });
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
  return api<VerifyFixResult>(`/projects/${args.projectId}/code/verify-fix`, {
    method: 'POST',
    body: {
      errors: args.errors,
      attempt: args.attempt,
      mode: args.mode,
      idempotency_key: args.idempotencyKey ?? crypto.randomUUID(),
    },
  });
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
  args: { projectId: string; prompt: string; mode: 'lite' | 'pro' },
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
  return result;
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
export async function classifyMessage(args: {
  projectId: string;
  prompt: string;
}): Promise<SafeguardingVerdict | null> {
  const res = await api<{ safeguarding: SafeguardingVerdict | null }>(
    `/projects/${args.projectId}/code/turn/classify`,
    { method: 'POST', body: { prompt: args.prompt } },
  );
  return res.safeguarding;
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
  return api<AgentTurnResult>(`/projects/${args.projectId}/code/turn/${args.turnId}/approve`, {
    method: 'POST',
    body: { decision: args.decision },
  });
}
