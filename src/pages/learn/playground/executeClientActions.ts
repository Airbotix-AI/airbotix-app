import type { ClientAction } from '../code/codeApi';

/** The four panels the studio can surface/focus (Window ids = Split tabs + game). */
export type PanelTarget = 'chat' | 'code' | 'game' | 'assets';

/**
 * Studio-side handlers the interpreter dispatches to. The Workspace supplies them
 * so this module stays pure + testable. The core Group A teaching handlers
 * (run/restart/focus/openFile) are required; the rest are optional — an action
 * with no handler is a safe no-op, so the backend can add tools (D-PAP-08, App. A)
 * without breaking older clients.
 */
export interface ClientActionHandlers {
  runGame: () => void;
  restartGame: () => void;
  focusPanel: (target: PanelTarget) => void;
  /** Open a file in the code view; optionally scroll to / highlight a line range. */
  openFile?: (path: string, fromLine?: number, toLine?: number) => void;
  setTheme?: (mode: 'light' | 'dark') => void;
  setLayout?: (mode: 'window' | 'split') => void;
  showConsole?: (open: boolean) => void;
  physicsDebug?: (on: boolean) => void;
  setScreenSize?: (preset: string) => void;
  openHistory?: () => void;
  openAssetViewer?: () => void;
}

const PANELS: readonly PanelTarget[] = ['chat', 'code', 'game', 'assets'];

function asPanel(target: string | undefined, fallback: PanelTarget): PanelTarget {
  return PANELS.includes(target as PanelTarget) ? (target as PanelTarget) : fallback;
}

/**
 * Execute the workspace actions a turn returned. Pure dispatch over injected
 * handlers. The teaching tools (open_file / highlight_code / jump_to_line) all
 * route through `openFile` so the studio scrolls to / highlights what the agent
 * just changed. Actions with no matching handler are ignored (forward-compatible):
 * the backend exposes the full Group A–D surface, but the studio only wires the
 * tools it can honour today.
 */
export function executeClientActions(
  actions: ClientAction[] | undefined,
  handlers: ClientActionHandlers,
): void {
  if (!actions?.length) return;
  for (const a of actions) {
    switch (a.action) {
      case 'run_game':
        handlers.runGame();
        break;
      case 'restart_game':
        handlers.restartGame();
        break;
      case 'show_code':
        handlers.focusPanel(asPanel(a.target, 'code'));
        break;
      case 'focus_panel':
        handlers.focusPanel(asPanel(a.target, 'game'));
        break;
      case 'open_file':
        if (a.path) handlers.openFile?.(a.path);
        break;
      case 'jump_to_line':
        if (a.path) handlers.openFile?.(a.path, a.line);
        break;
      case 'highlight_code':
        if (a.path) handlers.openFile?.(a.path, a.fromLine, a.toLine);
        break;
      case 'show_console':
        handlers.showConsole?.(a.mode !== 'close');
        break;
      case 'physics_debug':
        handlers.physicsDebug?.(a.mode === 'on');
        break;
      case 'set_screen_size':
        if (a.mode) handlers.setScreenSize?.(a.mode);
        break;
      case 'set_theme':
        if (a.mode === 'light' || a.mode === 'dark') handlers.setTheme?.(a.mode);
        break;
      case 'set_layout':
        if (a.mode === 'window' || a.mode === 'split') handlers.setLayout?.(a.mode);
        break;
      case 'open_history':
        handlers.openHistory?.();
        break;
      case 'open_asset_viewer':
        (handlers.openAssetViewer ?? (() => handlers.focusPanel('assets')))();
        break;
      default:
        // show_button is a chat CTA; window move/resize, search, asset-gen, revert,
        // etc. have no studio handler yet — ignored so unknown/forthcoming actions
        // never break the turn.
        break;
    }
  }
}
