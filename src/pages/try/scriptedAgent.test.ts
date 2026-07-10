// Scripted demo agent (try-demo-mode-prd D-DEMO-04/06 / §3 v2). These tests are
// the DRIFT ALARM for the playground demo: if the bundled starter or the
// script's find/replace anchors (or the explain snippet, or the deliberate
// bug→fix pair) stop matching, they fail here — never silently in the public demo.

import { describe, expect, it, vi } from 'vitest';

import { buildExplainPrompt } from '../learn/playground/panes/explainPrompt';
import { fixPrompt } from '../learn/playground/panes/GameRunnerPane';
import {
  CONTACT_GATE_MESSAGE,
  locateLines,
  PLAYGROUND_DEMO_SCRIPT,
  TOUR_REMIX_ASSET_PATH,
  type DemoEditStep,
} from './demoScript.playground';
import { DEMO_GAME_FILE, demoStarterFiles } from './demoStarter.playground';
import {
  applyScriptStep,
  createScriptedDemoAgent,
  isConsoleFixPrompt,
  matchesStep,
} from './scriptedAgent';

/** The canned prompt that triggers step `i` (the explain step uses the REAL
 *  explain-this prompt, exactly as the selection toolbar builds it). */
function promptFor(i: number): string {
  const step = PLAYGROUND_DEMO_SCRIPT.steps[i];
  return step.kind === 'edit' ? step.prompt : buildExplainPrompt(step.snippet);
}

const editStep = (i: number): DemoEditStep => {
  const step = PLAYGROUND_DEMO_SCRIPT.steps[i];
  if (step.kind !== 'edit') throw new Error(`step ${i} is not an edit step`);
  return step;
};

describe('PLAYGROUND_DEMO_SCRIPT (v3)', () => {
  it('locks a non-empty initial prompt + first-turn reply, and ships the 6-step arc', () => {
    expect(PLAYGROUND_DEMO_SCRIPT.lockedPrompt.length).toBeGreaterThan(0);
    expect(PLAYGROUND_DEMO_SCRIPT.firstTurnReply.length).toBeGreaterThan(0);
    expect(PLAYGROUND_DEMO_SCRIPT.version).toBeGreaterThanOrEqual(3);
    expect(PLAYGROUND_DEMO_SCRIPT.steps.map((s) => s.kind)).toEqual([
      'edit', // faster apples
      'edit', // score +10
      'explain', // explain-this
      'edit', // wire the remixed sticker into the game (§3 step 7c)
      'edit', // deliberate bug ("You win!" calls an undefined method)
      'edit', // the fix turn
    ]);
    // Only the fix step doubles as the console's "Ask AI to fix" trigger.
    const fixTriggers = PLAYGROUND_DEMO_SCRIPT.steps.filter(
      (s) => s.kind === 'edit' && s.consoleFixTrigger,
    );
    expect(fixTriggers).toEqual([PLAYGROUND_DEMO_SCRIPT.steps[5]]);
  });

  it('every anchor applies to the sequentially-evolved starter (no drift)', () => {
    let files = demoStarterFiles();
    for (const [i, step] of PLAYGROUND_DEMO_SCRIPT.steps.entries()) {
      const game = files.find((f) => f.path === step.path);
      expect(game, `script targets ${step.path} which must exist in the starter`).toBeTruthy();
      if (step.kind === 'explain') {
        // The snippet the tour selects must read verbatim in the evolved file.
        expect(game!.content, 'explain snippet drifted').toContain(step.snippet);
        expect(locateLines(game!.content, step.snippet)).toBeTruthy();
        continue;
      }
      for (const edit of step.edits) {
        expect(game!.content, `find anchor missing for step ${i}`).toContain(edit.find);
      }
      const applied = applyScriptStep(step, files);
      expect(applied.changes).toHaveLength(1);
      expect(applied.changes[0].before).not.toBe(applied.changes[0].after);
      files = applied.files;
    }
    const finalGame = files.find((f) => f.path === DEMO_GAME_FILE)!.content;
    expect(finalGame).toContain('const FALL_SPEED = 260;');
    expect(finalGame).toContain('const POINTS_PER_CATCH = 10;');
    expect(finalGame).toContain(`'${TOUR_REMIX_ASSET_PATH}'`); // the remixed apple is wired in
    expect(finalGame).toContain('const WIN_SCORE = 100;');
    expect(finalGame).toMatch(/^ {2}makeWinBanner\(\) \{/m); // the fix defined it
    expect(finalGame).toContain("'You win! 🏆'");
  });

  it('the wire step swaps the apple art for the tour-remixed sticker (§3 step 7c)', () => {
    let files = demoStarterFiles();
    for (const i of [0, 1]) files = applyScriptStep(editStep(i), files).files;
    const wired = applyScriptStep(editStep(3), files);
    const game = wired.files.find((f) => f.path === DEMO_GAME_FILE)!.content;
    expect(game).toContain(`this.load.image('apple', '${TOUR_REMIX_ASSET_PATH}');`);
    expect(game).not.toContain("'assets/apple.svg'");
  });

  it('the bug step lands a REAL runtime error that the fix step repairs (§3 8–9)', () => {
    let files = demoStarterFiles();
    for (const i of [0, 1, 3]) files = applyScriptStep(editStep(i), files).files;
    const broken = applyScriptStep(editStep(4), files);
    const brokenGame = broken.files.find((f) => f.path === DEMO_GAME_FILE)!.content;
    // create() calls makeWinBanner() — which is NOT defined → reliable TypeError.
    expect(brokenGame).toContain('this.winBanner = this.makeWinBanner();');
    expect(brokenGame).not.toMatch(/^ {2}makeWinBanner\(\) \{/m);
    const fixed = applyScriptStep(editStep(5), broken.files);
    const fixedGame = fixed.files.find((f) => f.path === DEMO_GAME_FILE)!.content;
    expect(fixedGame).toMatch(/^ {2}makeWinBanner\(\) \{/m);
  });

  it('the emoji-art starter ships its sprites as Asset Viewer entries (§3 step 2/7)', () => {
    const files = demoStarterFiles();
    const game = files.find((f) => f.path === DEMO_GAME_FILE)!.content;
    for (const path of ['assets/apple.svg', 'assets/basket.svg']) {
      const asset = files.find((f) => f.path === path);
      expect(asset?.kind).toBe('asset');
      expect(asset?.content.startsWith('data:image/svg+xml;base64,')).toBe(true);
      // The game loads the SAME files (buildGamePreview inlines the path refs).
      expect(game).toContain(`'${path}'`);
    }
  });
});

describe('createScriptedDemoAgent', () => {
  it('replays the canned turns in order through the RunTurn seam', async () => {
    const onStepApplied = vi.fn();
    const agent = createScriptedDemoAgent({ onStepApplied, turnDelayMs: 0 });
    let files = demoStarterFiles();
    for (const [i, step] of PLAYGROUND_DEMO_SCRIPT.steps.entries()) {
      const result = await agent(promptFor(i), files);
      expect(result.summary).toBe(step.reply);
      expect(onStepApplied).toHaveBeenLastCalledWith(i);
      if (step.kind === 'explain') {
        // Explains never edit — same files by identity, no diff.
        expect(result.files).toBe(files);
        expect(result.changes).toBeUndefined();
        expect(result.toolsFired).toEqual([]);
      } else {
        expect(result.changes).toHaveLength(1);
        expect(result.toolsFired).toEqual([`edit_file:${step.path}`]);
        expect(result.files).not.toEqual(files);
      }
      files = result.files;
    }
    expect(onStepApplied).toHaveBeenCalledTimes(PLAYGROUND_DEMO_SCRIPT.steps.length);
  });

  it('matchesStep recognises the REAL explain-this prompt only', () => {
    const explain = PLAYGROUND_DEMO_SCRIPT.steps[2];
    expect(explain.kind).toBe('explain');
    if (explain.kind !== 'explain') return;
    expect(matchesStep(explain, buildExplainPrompt(explain.snippet).trim())).toBe(true);
    expect(matchesStep(explain, 'explain this please')).toBe(false);
  });

  // ── DRIFT ALARM (§3 step 9): the console's REAL "Ask AI to fix" prompt must
  // keep triggering the scripted fix turn. `fixPrompt` is the actual builder the
  // console button calls — if its copy/shape changes, this fails loudly here,
  // never silently in the public demo.
  it('the console\'s real "Ask AI to fix" prompt triggers the fix step (drift alarm)', async () => {
    const consolePrompt = fixPrompt([
      {
        level: 'error',
        text: 'TypeError: this.makeWinBanner is not a function',
        loc: { file: DEMO_GAME_FILE, line: 31, col: 5 },
      },
    ]);
    expect(isConsoleFixPrompt(consolePrompt.trim())).toBe(true);
    // …with or without a source location.
    expect(
      isConsoleFixPrompt(fixPrompt([{ level: 'error', text: 'ReferenceError: x' }]).trim()),
    ).toBe(true);
    // …and with the D-HARN-11a evidence sections (older errors + a stack): the
    // matcher tolerates the multi-line body (prefix + closing line are stable).
    expect(
      isConsoleFixPrompt(
        fixPrompt([
          { level: 'error', text: 'ReferenceError: x' },
          {
            level: 'error',
            text: 'TypeError: boom',
            loc: { file: DEMO_GAME_FILE, line: 3, col: 1 },
            stack: 'TypeError: boom\n    at create (Game.js:3:1)',
          },
        ]).trim(),
      ),
    ).toBe(true);

    const fixStep = editStep(5);
    expect(matchesStep(fixStep, consolePrompt.trim())).toBe(true);
    // Only the flagged fix step accepts it — every other step stays exact-match.
    expect(matchesStep(editStep(0), consolePrompt.trim())).toBe(false);

    // End-to-end through the agent: clicking the console button mid-script (at
    // the error step) continues the script with the fix turn + advances the tour.
    const onStepApplied = vi.fn();
    const agent = createScriptedDemoAgent({ onStepApplied, turnDelayMs: 0 });
    let files = demoStarterFiles();
    for (const i of [0, 1, 2, 3, 4]) files = (await agent(promptFor(i), files)).files;
    const fixed = await agent(consolePrompt, files);
    expect(fixed.summary).toBe(fixStep.reply);
    expect(onStepApplied).toHaveBeenLastCalledWith(5);
    expect(fixed.files.find((f) => f.path === DEMO_GAME_FILE)!.content).toMatch(
      /^ {2}makeWinBanner\(\) \{/m,
    );
  });

  it('gates an off-script prompt without touching files or advancing (D-DEMO-06)', async () => {
    const agent = createScriptedDemoAgent({ turnDelayMs: 0 });
    const files = demoStarterFiles();
    const gated = await agent('make me a dragon game', files);
    expect(gated.summary).toBe(CONTACT_GATE_MESSAGE);
    expect(gated.summary).toContain('airbotix.ai/book');
    expect(gated.summary).toContain('airbotix.ai/contact');
    expect(gated.files).toBe(files); // untouched, by identity
    expect(gated.changes).toBeUndefined();
    // The script did NOT advance — the first canned prompt still applies.
    const next = await agent(promptFor(0), files);
    expect(next.summary).toBe(editStep(0).reply);
  });

  it('gates every prompt after the script completes (free explore)', async () => {
    const agent = createScriptedDemoAgent({ turnDelayMs: 0 });
    let files = demoStarterFiles();
    for (const i of PLAYGROUND_DEMO_SCRIPT.steps.keys()) {
      files = (await agent(promptFor(i), files)).files;
    }
    const after = await agent(promptFor(0), files);
    expect(after.summary).toBe(CONTACT_GATE_MESSAGE);
    expect(after.files).toBe(files);
  });
});
