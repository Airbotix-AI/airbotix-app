import type { VfsFile } from '../../code/codeApi';
import { AIChatPanel } from './AIChatPanel';
import { useGameAgent } from './useGameAgent';

interface ChatPaneProps {
  files: VfsFile[];
  onApplyFiles: (f: VfsFile[]) => void;
}

// Chat applies the AI's edits to the VFS but does NOT run the game — the kid
// presses ▶ Play to see changes, so chatting never auto-plays.
export function ChatPane({ files, onApplyFiles }: ChatPaneProps) {
  const { chat, busy, error, send } = useGameAgent({ files, onApplyFiles });

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <AIChatPanel chat={chat} busy={busy} error={error} onSend={send} />
    </div>
  );
}
