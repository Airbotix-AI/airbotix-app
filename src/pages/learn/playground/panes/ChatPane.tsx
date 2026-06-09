import type { LearningContext, SafeguardingVerdict } from '../../code/codeApi';
import { ResumeRecap } from '../ResumeRecap';
import { AIChatPanel } from './AIChatPanel';
import type { ChatItem, PendingTurn } from './useGameAgent';

interface ChatPaneProps {
  chat: ChatItem[];
  /** Resume recap to show above the chat (welcome-back), if any (D-PAP-19,22). */
  recap?: LearningContext | null;
  onContinueRecap?: () => void;
  busy: boolean;
  streaming?: boolean;
  error: string | null;
  offline?: boolean;
  balance?: number;
  pending?: PendingTurn | null;
  canUndo?: boolean;
  safeguard?: SafeguardingVerdict | null;
  handRaised?: boolean;
  inClass?: boolean;
  onSend: (text: string) => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  onRunGame?: () => void;
  onSeeCode?: () => void;
  onOpenFile?: (path: string, fromLine?: number, toLine?: number) => void;
  onStop?: () => void;
  onRetry?: () => void;
}

// Presentational. The chat state (`useGameAgent`) is owned by `Workspace` so it
// PERSISTS when toggling between Window and Split layouts (this pane remounts
// across modes; lifting the state keeps the history).
export function ChatPane({ recap, onContinueRecap, ...props }: ChatPaneProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-pg-bg">
      {recap && (
        <div className="shrink-0 p-3">
          <ResumeRecap context={recap} onContinue={() => onContinueRecap?.()} />
        </div>
      )}
      <AIChatPanel {...props} />
    </div>
  );
}
