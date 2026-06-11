// Scripted demo agent (try-demo-mode-prd D-DEMO-04/06). These tests are the
// DRIFT ALARM for the playground demo: if the bundled starter or the script's
// find/replace anchors stop matching, they fail here — never silently in the
// public demo.

import { describe, expect, it, vi } from 'vitest';

import { CONTACT_GATE_MESSAGE, PLAYGROUND_DEMO_SCRIPT } from './demoScript.playground';
import { DEMO_GAME_FILE, demoStarterFiles } from './demoStarter.playground';
import { applyScriptStep, createScriptedDemoAgent } from './scriptedAgent';

describe('PLAYGROUND_DEMO_SCRIPT', () => {
  it('locks a non-empty initial prompt and ships exactly 3 steps', () => {
    expect(PLAYGROUND_DEMO_SCRIPT.lockedPrompt.length).toBeGreaterThan(0);
    expect(PLAYGROUND_DEMO_SCRIPT.steps).toHaveLength(3);
  });

  it('every edit applies to the sequentially-evolved starter (no drift)', () => {
    let files = demoStarterFiles();
    for (const step of PLAYGROUND_DEMO_SCRIPT.steps) {
      const game = files.find((f) => f.path === step.path);
      expect(game, `script targets ${step.path} which must exist in the starter`).toBeTruthy();
      for (const edit of step.edits) {
        expect(game!.content, `find anchor missing for "${step.prompt}"`).toContain(edit.find);
      }
      const applied = applyScriptStep(step, files);
      expect(applied.changes).toHaveLength(1);
      expect(applied.changes[0].before).not.toBe(applied.changes[0].after);
      files = applied.files;
    }
    const finalGame = files.find((f) => f.path === DEMO_GAME_FILE)!.content;
    expect(finalGame).toContain('const FALL_SPEED = 260;');
    expect(finalGame).toContain('const POINTS_PER_CATCH = 10;');
    expect(finalGame).toContain('const BASKET_WIDTH = 160;');
    expect(finalGame).toContain("'You win!'");
  });
});

describe('createScriptedDemoAgent', () => {
  it('replays the canned turns in order through the RunTurn seam', async () => {
    const onStepApplied = vi.fn();
    const agent = createScriptedDemoAgent({ onStepApplied, turnDelayMs: 0 });
    let files = demoStarterFiles();
    for (const [i, step] of PLAYGROUND_DEMO_SCRIPT.steps.entries()) {
      const result = await agent(step.prompt, files);
      expect(result.summary).toBe(step.reply);
      expect(result.changes).toHaveLength(1);
      expect(result.toolsFired).toEqual([`edit_file:${step.path}`]);
      expect(result.files).not.toEqual(files);
      expect(onStepApplied).toHaveBeenLastCalledWith(i);
      files = result.files;
    }
    expect(onStepApplied).toHaveBeenCalledTimes(3);
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
    const next = await agent(PLAYGROUND_DEMO_SCRIPT.steps[0].prompt, files);
    expect(next.summary).toBe(PLAYGROUND_DEMO_SCRIPT.steps[0].reply);
  });

  it('gates every prompt after the script completes (free explore)', async () => {
    const agent = createScriptedDemoAgent({ turnDelayMs: 0 });
    let files = demoStarterFiles();
    for (const step of PLAYGROUND_DEMO_SCRIPT.steps) {
      files = (await agent(step.prompt, files)).files;
    }
    const after = await agent(PLAYGROUND_DEMO_SCRIPT.steps[0].prompt, files);
    expect(after.summary).toBe(CONTACT_GATE_MESSAGE);
    expect(after.files).toBe(files);
  });
});
