import { describe, expect, it } from 'vitest';

import {
  startProgress,
  describeToolStep,
  applyToolDelta,
  applyVerifyStep,
  applyFixingStep,
  stepElapsedSeconds,
  totalElapsedSeconds,
  currentStateLabel,
  LOOKING_STEP,
  VERIFY_STEP,
  FIXING_STEP,
} from './turnProgress';

const T0 = 1_000_000;

describe('turnProgress — honest per-turn progress model', () => {
  it('starts with the "looking at your game" step active', () => {
    const p = startProgress(T0);
    expect(p.steps).toHaveLength(1);
    expect(p.steps[0]).toMatchObject({ label: LOOKING_STEP, status: 'active' });
  });

  describe('describeToolStep — friendly labels', () => {
    it('humanises a new file write with "Adding"', () => {
      expect(describeToolStep('write_file:src/scenes/Aliens.js')).toEqual({
        key: 'src/scenes/Aliens.js',
        label: 'Adding Aliens ✍️',
      });
    });
    it('uses "Updating" for an edit, and splits CamelCase', () => {
      expect(describeToolStep('edit_file:PlayerShip.js')?.label).toBe('Updating Player Ship ✍️');
    });
    it('gives structural files a feature-y label', () => {
      expect(describeToolStep('edit_file:main.js')?.label).toBe('Wiring it together 🔌');
      expect(describeToolStep('write_file:style.css')?.label).toBe('Making it look nice 🎨');
    });
    it('ignores non-file tools (search/help/etc.)', () => {
      expect(describeToolStep('search_assets:rocket')).toBeNull();
      expect(describeToolStep('run_game')).toBeNull();
    });
  });

  it('a new file finishes the active step and appends a fresh active one', () => {
    let p = startProgress(T0);
    p = applyToolDelta(p, 'write_file:Aliens.js', T0 + 2000);
    expect(p.steps).toHaveLength(2);
    expect(p.steps[0]).toMatchObject({ status: 'done', endedAt: T0 + 2000 });
    expect(p.steps[1]).toMatchObject({ label: 'Adding Aliens ✍️', status: 'active' });
  });

  it('dedupes by file — writing the same file again does not add a row', () => {
    let p = startProgress(T0);
    p = applyToolDelta(p, 'write_file:Aliens.js', T0 + 1000);
    const before = p.steps.length;
    p = applyToolDelta(p, 'write_file:Aliens.js', T0 + 1500); // still active → no-op
    expect(p.steps).toHaveLength(before);
  });

  it('a rewrite of an already-finished file shows a calm "fixing" beat, not a dupe', () => {
    let p = startProgress(T0);
    p = applyToolDelta(p, 'write_file:Aliens.js', T0 + 1000); // Aliens active
    p = applyToolDelta(p, 'write_file:Game.js', T0 + 2000); // Aliens done, Game active
    p = applyToolDelta(p, 'write_file:Aliens.js', T0 + 3000); // rewrite of done Aliens
    const aliens = p.steps.find((s) => s.key === 'Aliens.js')!;
    expect(aliens.status).toBe('fixing');
    expect(aliens.startedAt).toBe(T0 + 3000); // timer restarts for the fix beat
    // No duplicate Aliens row.
    expect(p.steps.filter((s) => s.key === 'Aliens.js')).toHaveLength(1);
  });

  it('verify + fixing steps append once with their copy', () => {
    let p = startProgress(T0);
    p = applyVerifyStep(p, T0 + 1000);
    expect(p.steps.at(-1)).toMatchObject({ key: '@verify', label: VERIFY_STEP, status: 'active' });
    p = applyVerifyStep(p, T0 + 1100); // idempotent — only one verify row
    expect(p.steps.filter((s) => s.key === '@verify')).toHaveLength(1);
    p = applyFixingStep(p, T0 + 2000);
    expect(p.steps.at(-1)).toMatchObject({ label: FIXING_STEP, status: 'fixing' });
  });

  it('timers: active step + total tick; a done step freezes its duration', () => {
    let p = startProgress(T0);
    p = applyToolDelta(p, 'write_file:Aliens.js', T0 + 2000); // step0 done @2s
    const now = T0 + 5000;
    expect(stepElapsedSeconds(p.steps[0], now)).toBe(2); // frozen at 2s
    expect(stepElapsedSeconds(p.steps[1], now)).toBe(3); // active: 5-2 = 3s
    expect(totalElapsedSeconds(p, now)).toBe(5);
  });

  describe('currentStateLabel — the card\'s single status line', () => {
    it('returns the real label for a tool-delta step', () => {
      let p = startProgress(T0);
      p = applyToolDelta(p, 'write_file:Aliens.js', T0 + 2000);
      expect(currentStateLabel(p.steps.at(-1)!, T0 + 60_000)).toBe('Adding Aliens ✍️');
    });

    it('rotates generic fillers every 4s while still on the opening step', () => {
      const p = startProgress(T0);
      const step = p.steps[0];
      expect(currentStateLabel(step, T0)).toBe(LOOKING_STEP);
      expect(currentStateLabel(step, T0 + 3000)).toBe(LOOKING_STEP);
      expect(currentStateLabel(step, T0 + 5000)).toBe('Thinking it through 🤔');
      expect(currentStateLabel(step, T0 + 9000)).toBe('Trying some ideas 💡');
      expect(currentStateLabel(step, T0 + 13_000)).toBe('Still working away 🛠️');
      expect(currentStateLabel(step, T0 + 17_000)).toBe(LOOKING_STEP); // wraps
    });
  });
});
