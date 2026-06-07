// Presentational AI chat panel for the game studio. Mirrors `code/CodeChat.tsx`
// look + K-12 tokens, minus Stars/balance/approval (the stub turn has none).
// PURELY PRESENTATIONAL: the `useGameAgent` hook is owned by the consumer
// (CodeEditorPane) and its state is passed in via props — this component never
// calls the hook itself.

import { Code2, Loader2, Play, Send, Sparkles } from 'lucide-react';
import { useState } from 'react';

import type { ChatItem } from './useGameAgent';

interface AIChatPanelProps {
  chat: ChatItem[];
  busy: boolean;
  error: string | null;
  onSend: (text: string) => void;
  /** In-chat CTA handlers (the launch hand-off message renders Run / See code). */
  onRunGame?: () => void;
  onSeeCode?: () => void;
}

export function AIChatPanel({ chat, busy, error, onSend, onRunGame, onSeeCode }: AIChatPanelProps) {
  const [input, setInput] = useState('');

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    setInput('');
    onSend(t);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-pg-border px-4 py-3">
        <span className="flex items-center gap-1.5 text-[14px] font-extrabold text-pg-text">
          <Sparkles size={16} className="text-brand-sunshine" />
          AI Helper
        </span>
        <span className="rounded-full bg-wash-sunshine px-2.5 py-0.5 text-[10.5px] font-extrabold text-ink">
          stub demo
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {chat.length === 0 && (
          <div className="py-8 text-center text-[14px] font-semibold text-pg-text-dim">
            Tell me what to make and I'll code it 🤖
          </div>
        )}
        {chat.map((item) => (
          <ChatRow key={item.id} item={item} onRunGame={onRunGame} onSeeCode={onSeeCode} />
        ))}
      </div>

      {error && (
        <div className="mx-4 mb-2 rounded-2xl border border-brand-coral/40 bg-brand-coral/15 px-4 py-2 text-[12px] font-medium text-pg-text">
          {error}
        </div>
      )}

      <div className="shrink-0 border-t border-pg-border p-3">
        <div className="flex items-center gap-2 rounded-2xl border-2 border-pg-border bg-pg-text/5 pr-1.5 focus-within:border-brand-sky">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="What should we build?"
            rows={2}
            className="min-w-0 flex-1 resize-none bg-transparent px-3.5 py-2.5 text-[14px] text-pg-text placeholder:text-pg-text-muted focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-grad-sky text-white shadow-brand-sky transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <div className="mt-1.5 text-[11px] text-pg-text-muted">Enter to send · Shift+Enter for a new line</div>
      </div>
    </div>
  );
}

function ChatRow({
  item,
  onRunGame,
  onSeeCode,
}: {
  item: ChatItem;
  onRunGame?: () => void;
  onSeeCode?: () => void;
}) {
  if (item.role === 'kid') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-grad-sky text-white px-4 py-2.5 text-[14px] leading-relaxed shadow-brand-sky">
          {item.text}
        </div>
      </div>
    );
  }
  const hasActions = item.actions && item.actions.length > 0;
  return (
    <div className="flex justify-start">
      <div
        // The chat-first launch hand-off message (the one carrying Run / See-code
        // actions) is the stable marker that the studio opened (PRD J1 testid).
        data-testid={hasActions ? 'chat-starter' : undefined}
        className={`max-w-[90%] rounded-2xl border border-pg-border bg-pg-text/10 px-4 py-2.5 text-[14px] leading-relaxed text-pg-text ${
          item.pending ? 'italic opacity-60' : ''
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

        {hasActions && (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.actions?.includes('run') && (
              <button
                type="button"
                onClick={onRunGame}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand-mint px-4 py-2 text-[13px] font-extrabold text-ink shadow-brand-mint transition-transform hover:-translate-y-0.5"
              >
                <Play size={16} /> Run game
              </button>
            )}
            {item.actions?.includes('code') && (
              <button
                type="button"
                onClick={onSeeCode}
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-brand-sky/60 px-4 py-2 text-[13px] font-extrabold text-brand-sky transition-colors hover:bg-brand-sky/10"
              >
                <Code2 size={16} /> See code
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
