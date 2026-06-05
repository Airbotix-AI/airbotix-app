import { AIChatPanel } from './AIChatPanel';
import type { ChatItem } from './useGameAgent';

interface ChatPaneProps {
  chat: ChatItem[];
  busy: boolean;
  error: string | null;
  onSend: (text: string) => void;
}

// Presentational. The chat state (`useGameAgent`) is owned by `Workspace` so it
// PERSISTS when toggling between Window and Split layouts (this pane remounts
// across modes; lifting the state keeps the history).
export function ChatPane({ chat, busy, error, onSend }: ChatPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <AIChatPanel chat={chat} busy={busy} error={error} onSend={onSend} />
    </div>
  );
}
