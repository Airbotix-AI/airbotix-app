// Honest, kid-friendly progress for ONE chat turn. The steps are built from the
// SAME real tool/action deltas the agent fires (replayed today via `streamTurn`,
// live when WS `agent.*`/`code.tool.*` deltas land — the `onDelta` seam). They are
// NEVER fake cycling copy. One turn shows ONE progress card, which then resolves
// into exactly ONE message. See WorkingCard.tsx for the visual.
//
// Pure + deterministic (the caller passes `now`) so the whole model is unit-tested
// without timers or a real turn.

export type StepStatus = 'active' | 'done' | 'fixing';

export interface ProgressStep {
  id: string;
  /** A file path / 'verify' / 'fix' — dedupe key so a re-write doesn't add a row. */
  key: string;
  label: string;
  status: StepStatus;
  /** ms epoch when this step started (for the per-step timer). */
  startedAt: number;
  /** ms epoch when it finished (frozen duration on a done step). */
  endedAt?: number;
}

export interface TurnProgress {
  startedAt: number;
  steps: ProgressStep[];
}

// The opening step, shown immediately while the request is in flight (before any
// tool fires) so the card is never empty — honest: it IS looking at the game.
export const LOOKING_STEP = 'Looking at your game';
export const VERIFY_STEP = 'Making sure it works';
export const FIXING_STEP = 'Fixing a little glitch';

// Structural files get a friendly, feature-y label instead of "Updating main.js".
const KNOWN_FILE_LABELS: Record<string, string> = {
  main: 'Wiring it together',
  Game: 'Building the game',
  Boot: 'Getting things ready',
  GameOver: 'Setting up the ending',
  style: 'Making it look nice',
  index: 'Setting up the page',
};

/** A kid-friendly step label + dedupe key for a write/edit tool, or null if the
 *  tool isn't a file write (search/help/etc. — not worth a progress row). */
export function describeToolStep(tool: string): { key: string; label: string } | null {
  const m = /^(write_file|edit_file):(.+)$/.exec(tool);
  if (!m) return null;
  const path = m[2];
  const name = path.split('/').pop() ?? path;
  const base = name.replace(/\.[^.]+$/, '');
  if (KNOWN_FILE_LABELS[base]) return { key: path, label: KNOWN_FILE_LABELS[base] };
  const human = base.replace(/[_-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const verb = m[1] === 'write_file' ? 'Adding' : 'Updating';
  return { key: path, label: `${verb} ${human}` };
}

let seq = 0;
const nextStepId = (): string => `step-${(seq += 1)}`;

/** Start a turn's progress with the opening "looking" step active. */
export function startProgress(now: number): TurnProgress {
  seq = 0;
  return {
    startedAt: now,
    steps: [{ id: nextStepId(), key: '@looking', label: LOOKING_STEP, status: 'active', startedAt: now }],
  };
}

/** Mark every currently-active step done (frozen at `now`). */
function settleActive(steps: ProgressStep[], now: number): ProgressStep[] {
  return steps.map((s) => (s.status === 'active' ? { ...s, status: 'done', endedAt: now } : s));
}

/**
 * Fold one tool delta into the progress. New file → finish the active step and
 * append a fresh active step. A REPEAT file whose step already finished is a
 * rewrite (a syntax-fix / polish pass) → it briefly returns as a `fixing` beat
 * rather than adding a duplicate row. A non-file tool is ignored.
 */
export function applyToolDelta(progress: TurnProgress, tool: string, now: number): TurnProgress {
  const step = describeToolStep(tool);
  if (!step) return progress;
  const existing = progress.steps.find((s) => s.key === step.key);
  if (existing) {
    // Rewrite of a file we already wrote → show a calm "fixing" beat on it.
    if (existing.status === 'done') {
      const steps = settleActive(progress.steps, now).map((s) =>
        s.id === existing.id ? { ...s, status: 'fixing' as StepStatus, startedAt: now, endedAt: undefined } : s,
      );
      return { ...progress, steps };
    }
    return progress; // already active/fixing — nothing new to show
  }
  const steps = [
    ...settleActive(progress.steps, now),
    { id: nextStepId(), key: step.key, label: step.label, status: 'active' as StepStatus, startedAt: now },
  ];
  return { ...progress, steps };
}

/** Append the "making sure it works" verify step (the run/self-verify beat). */
export function applyVerifyStep(progress: TurnProgress, now: number): TurnProgress {
  if (progress.steps.some((s) => s.key === '@verify')) return progress;
  return {
    ...progress,
    steps: [
      ...settleActive(progress.steps, now),
      { id: nextStepId(), key: '@verify', label: VERIFY_STEP, status: 'active', startedAt: now },
    ],
  };
}

/** Append the "fixing a little glitch" step (self-verify auto-fix beat). */
export function applyFixingStep(progress: TurnProgress, now: number): TurnProgress {
  return {
    ...progress,
    steps: [
      ...settleActive(progress.steps, now),
      { id: nextStepId(), key: '@fix', label: FIXING_STEP, status: 'fixing', startedAt: now },
    ],
  };
}

/** Whole-seconds the step has run (frozen if done). For the per-step timer. */
export function stepElapsedSeconds(step: ProgressStep, now: number): number {
  return Math.max(0, Math.round(((step.endedAt ?? now) - step.startedAt) / 1000));
}

// Rotating fillers for the opening stretch where no real tool delta has landed
// yet — we genuinely don't know what the agent is doing, so the line stays alive
// with generic (never falsely specific) copy instead of sitting frozen.
const FILLERS = [LOOKING_STEP, 'Thinking it through', 'Trying some ideas', 'Still working away'];
const FILLER_ROTATE_SECS = 4;

/** The card's single current-state line: the step's real label, or — while we're
 *  still on the opening "looking" step — a filler that rotates every few seconds.
 *  Pure (`now` passed in) so the rotation is unit-testable. */
export function currentStateLabel(step: ProgressStep, now: number): string {
  if (step.key !== '@looking') return step.label;
  return FILLERS[Math.floor(stepElapsedSeconds(step, now) / FILLER_ROTATE_SECS) % FILLERS.length];
}

/** Total whole-seconds the turn has run — the header clock. */
export function totalElapsedSeconds(progress: TurnProgress, now: number): number {
  return Math.max(0, Math.round((now - progress.startedAt) / 1000));
}

/** Whole-seconds → "4s" under a minute, "1:07" beyond. */
export function formatSecs(n: number): string {
  if (n < 60) return `${n}s`;
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
