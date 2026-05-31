// Code Studio data layer. Typed against learn-code-studio-prd.md §3/§4/§4.5
// (decision D-CODE1) + platform-backend-api-spec.md §5.7 (projects).
//
// Per D-CODE1 the agent loop runs SERVER-SIDE in `platform-backend/code-sessions`.
// This SPA is a THIN CLIENT: it never runs the LLM loop or parses code fences.
// It calls three public endpoints (D-CODE1d) and renders whatever the backend
// returns (changes / files / summary / plan). Every call uses the shared `api`
// client so auth + refresh + error envelopes behave identically to the rest of
// the app, and no LLM endpoint is ever hit directly (airbotix-app CLAUDE.md #5).

import { api } from '@/lib/api';

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
 * Read the project's virtual FS. The backend seeds starter template files into
 * the VFS at project create (D-CODE1d), so this endpoint is the single source
 * of truth — there is no local starter fallback. Used for initial load + the
 * iframe preview.
 */
export async function readVfs(projectId: string): Promise<VfsFile[]> {
  const res = await api<{ files: VfsFile[] }>(`/projects/${projectId}/code/files`);
  return res.files ?? [];
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
