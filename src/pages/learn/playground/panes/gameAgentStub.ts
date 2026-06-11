// Stubbed AI "turn" for the playground (design §7). This iteration is UI-SHELL
// ONLY: the AI chat is fully built UX-wise, but its turn is a LOCAL STUB so the
// desktop is demoable offline. No network, no LLM, no Stars (platform contract
// §5 — the real loop runs server-side in platform-backend/code-sessions).
//
// The whole point is the `runTurn` SEAM: `RunTurn` mirrors the shape the real
// backend call (`runAgentTurn` in ../../code/codeApi) will produce, so swapping
// the stub for the real call later changes ONLY this function — the chat hook
// (useGameAgent) and UI stay identical. `TurnResult.changes` mirrors codeApi's
// `FileChange` (path/before/after) so diff rendering is shared.

import type { VfsFile } from '../../code/codeApi';

/** Simulated round-trip so the pending → resolved chat transition is visible. */
const STUB_DELAY_MS = 400;

/** The one file the stub is allowed to deterministically tweak. */
const GAME_FILE_PATH = 'game.js';

/** Clearly-placeholder reply so kids/reviewers never mistake the stub for real AI. */
const STUB_SUMMARY_TWEAKED =
  "🤖 (AI demo) I'm not connected to the real AI yet — here's a sample tweak: " +
  'I nudged the game background to a new colour so you can see an edit flow through.';
const STUB_SUMMARY_NO_CHANGE =
  "🤖 (AI demo) I'm not connected to the real AI yet — here's a sample reply. " +
  "I couldn't find game.js to tweak, so nothing changed this time.";

/** A 6-digit hex literal in `game.js` (e.g. `0x1a1a2e`) — the stage background. */
const HEX_COLOR_RE = /0x[0-9a-fA-F]{6}/;
/** Deterministic replacement colour (K-12 "sky" family), so the tweak is fixed. */
const STUB_BG_COLOR = '0x38bdf8';

/** One agent turn: a clearly-placeholder summary + the (optionally tweaked) VFS. */
export interface TurnResult {
  summary: string;
  files: VfsFile[];
  toolsFired?: string[];
  changes?: { path: string; before: string; after: string }[];
}

/**
 * The swap seam. Stub now (`runTurnStub`); later this same signature is satisfied
 * by an adapter over `runAgentTurn` (codeApi) — `(prompt, files) => TurnResult`.
 */
export type RunTurn = (prompt: string, files: VfsFile[]) => Promise<TurnResult>;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// ── Try-demo seam (try-demo-mode-prd D-DEMO-04) ───────────────────────────────
// The public `/try/playground` demo swaps in a SCRIPTED agent through this seam
// (installed by `src/pages/try/demoAdapters.ts`); null (off) = the plain stub.
let demoRunTurn: RunTurn | null = null;
export function setDemoRunTurn(turn: RunTurn | null): void {
  demoRunTurn = turn;
}

/**
 * Local mock turn. Returns after a short simulated delay with a placeholder
 * summary and the VFS. If `game.js` exists and contains a 6-digit hex colour
 * literal, it deterministically swaps the FIRST one to `STUB_BG_COLOR` so the
 * turn → VFS → run path is visibly exercised; otherwise it returns files
 * unchanged. Never touches the network.
 */
export const runTurnStub: RunTurn = async (prompt, files) => {
  // Demo mode: the scripted demo agent replays canned turns (D-DEMO-04).
  if (demoRunTurn) return demoRunTurn(prompt, files);
  await delay(STUB_DELAY_MS);

  const gameFile = files.find((f) => f.path === GAME_FILE_PATH);
  const before = gameFile?.content ?? '';
  const canTweak = gameFile != null && HEX_COLOR_RE.test(before);

  if (!canTweak) {
    return { summary: STUB_SUMMARY_NO_CHANGE, files, toolsFired: [] };
  }

  const after = before.replace(HEX_COLOR_RE, STUB_BG_COLOR);
  const tweakedFiles = files.map((f) =>
    f.path === GAME_FILE_PATH
      ? { ...f, content: after, size: after.length }
      : f,
  );

  return {
    summary: STUB_SUMMARY_TWEAKED,
    files: tweakedFiles,
    toolsFired: [`edit_file:${GAME_FILE_PATH}`],
    changes: [{ path: GAME_FILE_PATH, before, after }],
  };
};
