import { useState } from 'react';

import { DiffViewer } from './DiffViewer';
import type { ChatItem } from './useCodeStudio';

interface CodeChatProps {
  chat: ChatItem[];
  busy: boolean;
  balance: number;
  error: string | null;
  /** When set, the latest agent item is a plan awaiting approval. */
  awaitingApproval: boolean;
  /** Lite mode hides diffs and shows only the plain summary (PRD §2.4). */
  lite?: boolean;
  onSend: (text: string) => void;
  onApprove: () => void;
  onReject: () => void;
}

const ESTIMATED_COST = 2; // shown on the Ask button until the turn resolves (PRD §4.3)

export function CodeChat({
  chat,
  busy,
  balance,
  error,
  awaitingApproval,
  lite = false,
  onSend,
  onApprove,
  onReject,
}: CodeChatProps) {
  const [input, setInput] = useState('');

  const submit = () => {
    const t = input.trim();
    if (!t || busy || awaitingApproval) return;
    setInput('');
    onSend(t);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {chat.length === 0 && (
          <div className="text-center py-8">
            <span className="sticker-sky alt">Code Critter 🤖</span>
            <p className="lead-text mt-4" style={{ fontSize: '14px' }}>
              Tell me what to build or change. I write the code, you watch it run.
            </p>
          </div>
        )}
        {chat.map((item) => (
          <ChatRow key={item.id} item={item} lite={lite} />
        ))}

        {awaitingApproval && (
          <div className="flex gap-2">
            <button onClick={onApprove} className="btn-pill-primary text-[13px]">
              ✓ Yes, do it
            </button>
            <button onClick={onReject} className="btn-pill-secondary text-[13px]">
              ✕ No
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-2xl bg-wash-coral border border-brand-coral/30 px-4 py-2 text-[12px] font-medium text-ink">
          {error}
        </div>
      )}

      <div className="shrink-0 border-t border-hairline bg-canvas-pure p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={awaitingApproval ? 'Approve or reject the plan above first…' : 'What do you want to build?'}
            rows={2}
            disabled={awaitingApproval}
            className="flex-1 rounded-2xl border-2 border-hairline bg-canvas-pure px-4 py-3 text-[14px] text-ink placeholder:text-steel focus:border-brand-sky focus:outline-none resize-none disabled:opacity-60"
          />
          <button
            onClick={submit}
            disabled={busy || awaitingApproval || !input.trim() || balance < ESTIMATED_COST}
            className="btn-pill-primary shrink-0 self-stretch"
            title={balance < ESTIMATED_COST ? `Need ${ESTIMATED_COST}★, have ${balance}★` : ''}
          >
            {busy ? '…' : `✨ Ask −${ESTIMATED_COST}★`}
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate2">
          <span>Enter to send</span>
          <span className={balance < ESTIMATED_COST ? 'text-brand-coral font-bold' : ''}>{balance}★ left</span>
        </div>
      </div>
    </div>
  );
}

function ChatRow({ item, lite }: { item: ChatItem; lite: boolean }) {
  const [showDiff, setShowDiff] = useState(false);
  if (item.role === 'kid') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-grad-sky text-white px-4 py-2.5 text-[14px] leading-relaxed shadow-brand-sky">
          {item.text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed ${
          item.pending
            ? 'bg-surface text-ink-soft border border-hairline italic opacity-70'
            : 'bg-surface text-ink border border-hairline'
        }`}
      >
        <div className="whitespace-pre-wrap">{item.text}</div>

        {item.toolsFired && item.toolsFired.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.toolsFired.map((t, i) => (
              <span key={i} className="rounded-full bg-wash-mint px-2.5 py-0.5 text-[11px] font-bold text-ink">
                ✏️ {t.replace('edit_file:', '').replace('write_file:', '')}
              </span>
            ))}
          </div>
        )}

        {item.stars !== undefined && (
          <div className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.10em] text-slate2">
            −{item.stars}★ this turn
          </div>
        )}

        {!lite && item.changes && item.changes.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowDiff((v) => !v)}
              className="text-[12px] font-bold text-brand-sky hover:underline"
            >
              {showDiff ? '▲ Hide diff' : '▼ Show diff'}
            </button>
            {showDiff && (
              <div className="mt-2 space-y-2">
                {item.changes.map((c) => (
                  <DiffViewer key={c.path} change={c} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
