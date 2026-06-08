import type { ClientAction } from '../code/codeApi';

/** The four panels the studio can surface/focus (Window ids = Split tabs + game). */
export type PanelTarget = 'chat' | 'code' | 'game' | 'assets';

/**
 * Studio-side handlers the interpreter dispatches to. The Workspace supplies them
 * (run/restart the game, focus a panel) so this module stays pure + testable.
 */
export interface ClientActionHandlers {
  runGame: () => void;
  restartGame: () => void;
  focusPanel: (target: PanelTarget) => void;
}

const PANELS: readonly PanelTarget[] = ['chat', 'code', 'game', 'assets'];

function asPanel(target: string | undefined, fallback: PanelTarget): PanelTarget {
  return PANELS.includes(target as PanelTarget) ? (target as PanelTarget) : fallback;
}

/**
 * Execute the workspace actions a game-creation turn returned (run_game,
 * restart_game, show_code, focus_panel, …). Pure dispatch over injected handlers.
 * Unknown/unsupported actions (e.g. show_button, handled in the chat bubble) are
 * ignored, so the backend can add actions without breaking older clients.
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
      default:
        // show_button is surfaced as a chat CTA, not a workspace action; ignore here.
        break;
    }
  }
}
