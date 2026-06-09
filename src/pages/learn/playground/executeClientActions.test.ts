import { describe, expect, it, vi } from 'vitest';

import type { ClientAction } from '../code/codeApi';
import { executeClientActions, type ClientActionHandlers } from './executeClientActions';

function handlers(): ClientActionHandlers & {
  runGame: ReturnType<typeof vi.fn>;
  restartGame: ReturnType<typeof vi.fn>;
  focusPanel: ReturnType<typeof vi.fn>;
  openHelp: ReturnType<typeof vi.fn>;
} {
  return { runGame: vi.fn(), restartGame: vi.fn(), focusPanel: vi.fn(), openHelp: vi.fn() };
}

describe('executeClientActions', () => {
  it('is a no-op for empty/undefined actions', () => {
    const h = handlers();
    executeClientActions(undefined, h);
    executeClientActions([], h);
    expect(h.runGame).not.toHaveBeenCalled();
    expect(h.focusPanel).not.toHaveBeenCalled();
  });

  it('dispatches run_game and restart_game', () => {
    const h = handlers();
    executeClientActions([{ action: 'run_game' }, { action: 'restart_game' }], h);
    expect(h.runGame).toHaveBeenCalledTimes(1);
    expect(h.restartGame).toHaveBeenCalledTimes(1);
  });

  it('show_code focuses the code pane; focus_panel honours an explicit target', () => {
    const h = handlers();
    executeClientActions(
      [{ action: 'show_code' }, { action: 'focus_panel', target: 'assets' }],
      h,
    );
    expect(h.focusPanel).toHaveBeenNthCalledWith(1, 'code');
    expect(h.focusPanel).toHaveBeenNthCalledWith(2, 'assets');
  });

  it('falls back to a safe panel for a bad/absent target', () => {
    const h = handlers();
    executeClientActions(
      [{ action: 'focus_panel', target: 'nonsense' }, { action: 'focus_panel' }],
      h,
    );
    // 'game' is the fallback for focus_panel.
    expect(h.focusPanel).toHaveBeenNthCalledWith(1, 'game');
    expect(h.focusPanel).toHaveBeenNthCalledWith(2, 'game');
  });

  it('open_help opens the Guide at the doc + anchor', () => {
    const h = handlers();
    executeClientActions(
      [{ action: 'open_help', target: 'phaser/arcade-physics', anchor: 'gravity' }],
      h,
    );
    expect(h.openHelp).toHaveBeenCalledWith('phaser/arcade-physics', 'gravity');
  });

  it('open_help without a target is ignored (no blank Guide)', () => {
    const h = handlers();
    executeClientActions([{ action: 'open_help' }], h);
    expect(h.openHelp).not.toHaveBeenCalled();
  });

  it('focus_panel can target the help pane', () => {
    const h = handlers();
    executeClientActions([{ action: 'focus_panel', target: 'help' }], h);
    expect(h.focusPanel).toHaveBeenCalledWith('help');
  });

  it('ignores unsupported actions (forward-compatible)', () => {
    const h = handlers();
    executeClientActions(
      [{ action: 'show_button', label: '▶ Play' }, { action: 'future_thing' } as unknown as ClientAction],
      h,
    );
    expect(h.runGame).not.toHaveBeenCalled();
    expect(h.focusPanel).not.toHaveBeenCalled();
  });
});
