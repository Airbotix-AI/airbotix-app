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

  // MP4 / D-PAP-08: the teaching tools route through openFile (open / reveal /
  // highlight the file the agent just changed).
  it('routes open_file / jump_to_line / highlight_code through openFile with the right args', () => {
    const openFile = vi.fn();
    const h = { ...handlers(), openFile };
    executeClientActions(
      [
        { action: 'open_file', path: 'src/scenes/Game.js' },
        { action: 'jump_to_line', path: 'src/scenes/Game.js', line: 12 },
        { action: 'highlight_code', path: 'src/scenes/Game.js', fromLine: 3, toLine: 6 },
      ],
      h,
    );
    expect(openFile).toHaveBeenNthCalledWith(1, 'src/scenes/Game.js');
    expect(openFile).toHaveBeenNthCalledWith(2, 'src/scenes/Game.js', 12);
    expect(openFile).toHaveBeenNthCalledWith(3, 'src/scenes/Game.js', 3, 6);
  });

  it('ignores a path-less open_file / highlight_code (no crash)', () => {
    const openFile = vi.fn();
    const h = { ...handlers(), openFile };
    executeClientActions(
      [{ action: 'open_file' }, { action: 'highlight_code', fromLine: 1, toLine: 2 }],
      h,
    );
    expect(openFile).not.toHaveBeenCalled();
  });

  it('maps the toggle/look tools through their typed handlers (mode → boolean/enum)', () => {
    const showConsole = vi.fn();
    const physicsDebug = vi.fn();
    const setTheme = vi.fn();
    const setLayout = vi.fn();
    const setScreenSize = vi.fn();
    const h = { ...handlers(), showConsole, physicsDebug, setTheme, setLayout, setScreenSize };
    executeClientActions(
      [
        { action: 'show_console', mode: 'open' },
        { action: 'show_console', mode: 'close' },
        { action: 'physics_debug', mode: 'on' },
        { action: 'physics_debug', mode: 'off' },
        { action: 'set_theme', mode: 'dark' },
        { action: 'set_layout', mode: 'split' },
        { action: 'set_screen_size', mode: 'phone' },
      ],
      h,
    );
    expect(showConsole).toHaveBeenNthCalledWith(1, true);
    expect(showConsole).toHaveBeenNthCalledWith(2, false);
    expect(physicsDebug).toHaveBeenNthCalledWith(1, true);
    expect(physicsDebug).toHaveBeenNthCalledWith(2, false);
    expect(setTheme).toHaveBeenCalledWith('dark');
    expect(setLayout).toHaveBeenCalledWith('split');
    expect(setScreenSize).toHaveBeenCalledWith('phone');
  });

  it('rejects an invalid theme/layout mode (no handler call)', () => {
    const setTheme = vi.fn();
    const setLayout = vi.fn();
    const h = { ...handlers(), setTheme, setLayout };
    executeClientActions(
      [
        { action: 'set_theme', mode: 'rainbow' },
        { action: 'set_layout', mode: 'sideways' },
      ],
      h,
    );
    expect(setTheme).not.toHaveBeenCalled();
    expect(setLayout).not.toHaveBeenCalled();
  });

  it('open_asset_viewer falls back to focusing the assets pane when no dedicated handler', () => {
    const h = handlers();
    executeClientActions([{ action: 'open_asset_viewer' }], h);
    expect(h.focusPanel).toHaveBeenCalledWith('assets');
  });

  it('a teaching tool with a handler is honoured; an unwired tool is a safe no-op', () => {
    const openHistory = vi.fn();
    const h = { ...handlers(), openHistory };
    executeClientActions(
      [{ action: 'open_history' }, { action: 'move_window', rect: { x: 1, y: 2 } }],
      h,
    );
    expect(openHistory).toHaveBeenCalledTimes(1);
  });
});
