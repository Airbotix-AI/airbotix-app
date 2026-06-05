import type { VfsFile } from '../../code/codeApi';
import { AIChatPanel } from './AIChatPanel';
import { useGameAgent } from './useGameAgent';

interface ChatPaneProps {
  files: VfsFile[];
  onApplyFiles: (f: VfsFile[]) => void;
  onRun: () => void;
}

export function ChatPane({ files, onApplyFiles, onRun }: ChatPaneProps) {
  const { chat, busy, error, send } = useGameAgent({ files, onApplyFiles, onRun });

  return (
    <div className="flex h-full min-h-0 flex-col bg-ink">
      <AIChatPanel chat={chat} busy={busy} error={error} onSend={send} />
    </div>
  );
}
