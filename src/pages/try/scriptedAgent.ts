// The scripted demo agent for `/try/playground` (try-demo-mode-prd §2 D-DEMO-04
// / §3). It satisfies the EXISTING `RunTurn` seam (`panes/gameAgentStub.ts`), so
// the real chat hook (`useGameAgent`) runs it exactly like the offline stub:
// pending bubble → settled reply → `onApplyFiles` through the real store funnel
// (undo/history/save-status identical to a real turn). It replays the canned
// diffs from `demoScript.playground.ts` strictly in order; ANY other prompt —
// including everything after the script completes — gets the contact-us gate
// reply (D-DEMO-06) with the files untouched. No network, ever.

import type { VfsFile } from '../learn/code/codeApi';
import type { RunTurn, TurnResult } from '../learn/playground/panes/gameAgentStub';
import {
  CONTACT_GATE_MESSAGE,
  PLAYGROUND_DEMO_SCRIPT,
  type DemoScriptStep,
} from './demoScript.playground';

/** Simulated "thinking" beat so the pending → reply transition reads naturally. */
const SCRIPTED_TURN_DELAY_MS = 700;

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Apply one script step's find/replace edits to the VFS. Pure + drift-tolerant:
 * an edit whose `find` no longer matches is skipped (the tests catch drift; the
 * runtime stays honest — `changes` reflects only what actually changed).
 */
export function applyScriptStep(
  step: DemoScriptStep,
  files: VfsFile[],
): { files: VfsFile[]; changes: NonNullable<TurnResult['changes']> } {
  const changes: NonNullable<TurnResult['changes']> = [];
  const next = files.map((f) => {
    if (f.path !== step.path) return f;
    let after = f.content;
    for (const edit of step.edits) {
      if (after.includes(edit.find)) after = after.replace(edit.find, edit.replace);
    }
    if (after === f.content) return f;
    changes.push({ path: f.path, before: f.content, after });
    return { ...f, content: after, size: after.length };
  });
  return { files: next, changes };
}

export interface ScriptedAgentOptions {
  /** Notified after script step `index` (0-based) applies — drives the tour. */
  onStepApplied?: (index: number) => void;
  /** Test override for the simulated thinking beat. */
  turnDelayMs?: number;
}

/**
 * Create one demo session's agent. The step cursor lives in the closure, so a
 * fresh page (install) always starts from step 0 — reset-on-entry for free.
 */
export function createScriptedDemoAgent(opts: ScriptedAgentOptions = {}): RunTurn {
  const { onStepApplied, turnDelayMs = SCRIPTED_TURN_DELAY_MS } = opts;
  let nextStep = 0;

  return async (prompt, files) => {
    await delay(turnDelayMs);

    const step = PLAYGROUND_DEMO_SCRIPT.steps[nextStep];
    if (step && prompt.trim() === step.prompt) {
      const index = nextStep;
      nextStep += 1;
      const { files: applied, changes } = applyScriptStep(step, files);
      onStepApplied?.(index);
      return {
        summary: step.reply,
        files: applied,
        toolsFired: changes.map((c) => `edit_file:${c.path}`),
        changes,
      };
    }

    // Off-script (or script finished): the contact-us gate — nothing changes.
    return { summary: CONTACT_GATE_MESSAGE, files, toolsFired: [] };
  };
}
