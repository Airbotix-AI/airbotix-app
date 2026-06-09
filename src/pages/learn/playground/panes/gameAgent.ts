// Real game-agent adapter (PRD M3 / J2). Swaps the offline `gameAgentStub` for
// the SERVER-SIDE agent loop: `runAgentTurn` / `approveTurn` (code/codeApi), the
// same `/projects/:id/code/turn(/:id/approve)` endpoints the Code Studio uses (a
// game is just `kind='game'`). The kid NEVER calls an LLM — the loop runs in
// platform-backend (CLAUDE.md #5); this module only POSTs a prompt and renders
// what the backend returns.
//
// It also owns the J2 "streaming" RENDER contract: the turn result carries a
// summary + the tools it fired, and `streamTurn` replays them as incremental
// deltas (token reveal + per-tool steps) so the kid sees the agent "working".
// This is a deterministic, route-mockable client-side replay of the turn — the
// seam is ready for real WS `agent.*` / `code.tool.*` deltas (OQ-9 / D-GAME9)
// without changing the hook: feed those events through `onDelta` instead.

import {
  approveTurn as apiApproveTurn,
  classifyMessage as apiClassifyMessage,
  raiseHand as apiRaiseHand,
  reportRuntimeErrors as apiReportRuntimeErrors,
  runAgentTurn as apiRunAgentTurn,
  type AgentTurnResult,
  type SafeguardingVerdict,
  type VerifyFixResult,
  type VfsFile,
} from '../../code/codeApi';

/** A streamed delta the chat renders live as the turn runs. */
export type TurnDelta =
  | { type: 'token'; text: string }
  | { type: 'tool'; tool: string };

/** Run a turn against the real backend (Pro multi-file may need approval). */
export type RunAgentTurn = (args: {
  projectId: string;
  prompt: string;
  mode: 'lite' | 'pro';
  piiWarnAcknowledged?: boolean;
}) => Promise<AgentTurnResult>;

/** Approve / reject a staged (Pro) plan. */
export type ApproveAgentTurn = (args: {
  projectId: string;
  turnId: string;
  decision: 'approve' | 'reject';
}) => Promise<AgentTurnResult>;

/**
 * Run the safeguarding intent classifier (J13 / §11g) — server-side, BEFORE any
 * LLM call, so a distress/personal disclosure is deflected without ever spending a
 * turn (matches the J13 sequence "classify intent before any LLM"). Returns a
 * verdict ONLY when the message is deflected; `null` means "a normal game request,
 * proceed to a turn". The kid never calls an LLM (CLAUDE.md #5).
 */
export type ClassifyMessage = (args: {
  projectId: string;
  prompt: string;
}) => Promise<SafeguardingVerdict | null>;

/**
 * "Ask my teacher" raise-hand (J4) — posts a lightweight signal the teacher's live
 * view surfaces. Optional: the calm waiting state never depends on it succeeding,
 * and a project-less session has no backend. No LLM, no Stars (CLAUDE.md #5).
 */
export type RaiseHand = (args: { projectId: string }) => Promise<void>;

/**
 * Self-verify auto-fix (MP3 / D-PAP-09,13,23). Report the runtime errors the
 * sandbox captured running a just-applied game; the backend fixes them (≤2) or
 * hands off to co-debug.
 */
export type ReportRuntimeErrors = (args: {
  projectId: string;
  errors: string[];
  attempt: number;
  mode: 'lite' | 'pro';
}) => Promise<VerifyFixResult>;

/** Injectable backend seam (real by default; swapped in unit tests). */
export interface GameAgentDeps {
  runTurn: RunAgentTurn;
  approve: ApproveAgentTurn;
  classify: ClassifyMessage;
  raiseHand?: RaiseHand;
  reportRuntimeErrors: ReportRuntimeErrors;
}

export const realGameAgentDeps: GameAgentDeps = {
  runTurn: apiRunAgentTurn,
  approve: apiApproveTurn,
  classify: apiClassifyMessage,
  raiseHand: apiRaiseHand,
  reportRuntimeErrors: apiReportRuntimeErrors,
};

/** Per-token reveal cadence (ms). Kept short so a turn never feels laggy. */
const STREAM_TOKEN_MS = 18;
/** Pause between per-tool step chips (ms). */
const STREAM_TOOL_MS = 120;

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Split a summary into chat-streamable tokens (words + their trailing space). */
function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? (text ? [text] : []);
}

/**
 * Replay a completed turn as incremental deltas so the chat streams live: first
 * the per-tool steps (so the kid sees WHICH files the agent is touching), then
 * the summary token-by-token. `onDelta` is called for each; `signal` lets the
 * hook abort the replay (unmount / new turn). Deterministic given fixed input —
 * this is the route-mockable streaming the e2e asserts (`agent-msg-streaming`).
 */
export async function streamTurn(
  result: AgentTurnResult,
  onDelta: (d: TurnDelta) => void,
  signal?: { aborted: boolean },
): Promise<void> {
  for (const tool of result.tools_fired ?? []) {
    if (signal?.aborted) return;
    onDelta({ type: 'tool', tool });
    await wait(STREAM_TOOL_MS);
  }
  for (const token of tokenize(result.summary)) {
    if (signal?.aborted) return;
    onDelta({ type: 'token', text: token });
    await wait(STREAM_TOKEN_MS);
  }
}

/** A plain-English, typing-free prediction question for the agency/predict beat. */
export function predictionQuestion(prompt: string): string {
  const p = prompt.toLowerCase();
  if (/(faster|speed up|quicker)/.test(p)) return 'Will this make it faster or slower?';
  if (/(slower|slow down)/.test(p)) return 'Will this make it slower or faster?';
  if (/(bigger|larger|grow)/.test(p)) return 'Will this make it bigger or smaller?';
  if (/(smaller|shrink|tiny)/.test(p)) return 'Will this make it smaller or bigger?';
  if (/(colou?r|background|paint)/.test(p)) return 'What colour do you think it will become?';
  if (/(add|new|more)/.test(p)) return 'What new thing do you think will appear?';
  return 'What do you think will change in your game?';
}

/** True when the page is offline (used for the J2 "internet hiccup" banner). */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export type { AgentTurnResult, SafeguardingVerdict, VfsFile };
