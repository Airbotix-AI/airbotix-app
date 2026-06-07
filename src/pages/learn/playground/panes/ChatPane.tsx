import { AIChatPanel } from './AIChatPanel';
import type { ChatItem, PendingTurn } from './useGameAgent';

interface ChatPaneProps {
  chat: ChatItem[];
  busy: boolean;
  error: string | null;
  offline?: boolean;
  balance?: number;
  pending?: PendingTurn | null;
  canUndo?: boolean;
  onSend: (text: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
  onRunGame?: () => void;
  onSeeCode?: () => void;
}

// Presentational. The chat state (`useGameAgent`) is owned by `Workspace` so it
// PERSISTS when toggling between Window and Split layouts (this pane remounts
// across modes; lifting the state keeps the history).
export function ChatPane(props: ChatPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-pg-bg">
      <AIChatPanel {...props} />
    </div>
  );
}
