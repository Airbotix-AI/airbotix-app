// Presentational AI chat panel for the game studio (design §7 / mockup #6).
// Mirrors `code/CodeChat.tsx` look + K-12 tokens, minus Stars/balance/approval
// (the stub turn has none). PURELY PRESENTATIONAL: the `useGameAgent` hook is
// owned by the consumer (CodeEditorWindow) and its state is passed in via props
// — this component never calls the hook itself.

import { useState } from 'react';

import type { ChatItem } from './useGameAgent';

interface AIChatPanelProps {
  chat: ChatItem[];
  busy: boolean;
  error: string | null;
  onSend: (text: string) => void;
}

export function AIChatPanel({ chat, busy, error, onSend }: AIChatPanelProps) {
  const [input, setInput] = useState('');

  const submit = () => {
    const t = input.trim();
    if (!t || busy) return;
    setInput('');
    onSend(t);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-hairline px-4 py-3">
        <span className="text-[14px] font-extrabold text-ink">✨ AI Helper</span>
        <span className="rounded-full bg-wash-sunshine px-2.5 py-0.5 text-[10.5px] font-extrabold text-ink">
          stub demo
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3">
        {chat.length === 0 && (
          <div className="text-center py-8">
            <p className="lead-text" style={{ fontSize: '14px' }}>
              Tell me what to make and I'll code it 🤖
            </p>
          </div>
        )}
        {chat.map((item) => (
          <ChatRow key={item.id} item={item} />
        ))}
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
            placeholder="What should we build?"
            rows={2}
            className="flex-1 rounded-2xl border-2 border-hairline bg-canvas-pure px-4 py-3 text-[14px] text-ink placeholder:text-steel focus:border-brand-sky focus:outline-none resize-none disabled:opacity-60"
          />
          <button
            onClick={submit}
            disabled={busy || !input.trim()}
            className="btn-pill-primary shrink-0 self-stretch"
          >
            {busy ? '…' : '✨'}
          </button>
        </div>
        <div className="mt-1.5 text-[11px] text-slate2">Enter to send · Shift+Enter for a new line</div>
      </div>
    </div>
  );
}

function ChatRow({ item }: { item: ChatItem }) {
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
      </div>
    </div>
  );
}
