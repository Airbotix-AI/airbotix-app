import type { ChatImageRef, SafeguardingVerdict } from '../../code/codeApi';
import { AIChatPanel } from './AIChatPanel';
import type {
  ChatItem,
  PendingTurn,
  QueuedMessage,
  RetryPayload,
  SendImage,
  SendOptions,
} from './useGameAgent';

interface ChatPaneProps {
  chat: ChatItem[];
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
  onSend: (text: string, opts?: SendOptions) => void;
  /** Upload an attached chat image to S3 (D-PAP-33), bound to the project. */
  onUploadImage?: (file: File) => Promise<ChatImageRef>;
  /** The image-input flag is off (D-PAP-37) — hide the picture affordance. */
  imagesDisabled?: boolean;
  /** Bumps when an attached image was rejected (D-PAP-34) — clear staged thumbnails. */
  imageRejectNonce?: number;
  /** Bumps on a screen OUTAGE (D-PAP-46) — RE-STAGE these unjudged, already-uploaded pictures. */
  imageRestore?: { nonce: number; images: SendImage[] };
  onConfirm?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
  onRaiseHand?: () => void;
  onLowerHand?: () => void;
  onRunGame?: () => void;
  onSeeCode?: () => void;
  onOpenFile?: (path: string, fromLine?: number, toLine?: number) => void;
  onOpenAsset?: (path: string) => void;
  assetSrc?: (path: string) => string | undefined;
  onStop?: () => void;
  /** Stop waiting for the in-flight AI response — D-PAP-48. Forwarded to AIChatPanel. */
  onCancelTurn?: () => void;
  onRetry?: () => void;
  /** Replay a specific retryable bubble's turn (its own prompt + key, D-HARN-02). */
  onRetryTurn?: (retry: RetryPayload) => void;
  /** The ONE queued next message while a turn is busy (D-HARN-03) — the pill. */
  queuedMessage?: QueuedMessage | null;
  /** Drop the queued message (the pill's ✕). */
  onCancelQueued?: () => void;
  /** Teacher live viewer (D-LV-6) — render chat history only; no composer / actions. */
  readOnly?: boolean;
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
