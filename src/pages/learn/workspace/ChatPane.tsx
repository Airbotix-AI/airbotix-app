import { useEffect, useRef } from 'react';

import type { Message } from './WorkspacePage';
import type { ToolKind } from './ToolPicker';

export function ChatPane({
  messages,
  loading,
  sending,
  tool,
  empty,
}: {
  messages: Message[];
  loading: boolean;
  sending: boolean;
  tool: ToolKind;
  empty: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  if (empty) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-[64px]">💬</div>
          <h2 className="hero-display mt-4" style={{ fontSize: '32px' }}>
            What do you want to make?
          </h2>
          <p className="lead-text mt-3" style={{ fontSize: '15px' }}>
            Pick a tool below, type a prompt, and press Send. Your session shows up on the left.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            {[
              'Help me write a haiku about cats',
              'Draw a robot dog',
              'Compose a happy birthday tune',
              'Make a video of a flying dragon',
            ].map((t) => (
              <span key={t} className="rounded-full bg-surface px-3 py-1.5 text-[12px] text-ink-soft">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
      {loading && <p className="lead-text text-center">Loading…</p>}
      {!loading && messages.length === 0 && (
        <div className="text-center py-12">
          <p className="lead-text">New session — type something below to start.</p>
        </div>
      )}
      {messages.map((m) => (
        <Bubble key={m.id} message={m} />
      ))}
      {sending && (
        <Bubble
          message={{
            id: 'pending',
            role: 'assistant',
            tool,
            content: tool === 'chat' ? 'Thinking…' : `Making your ${tool}…`,
            artifact_id: null,
            stars_charged: 0,
            created_at: new Date().toISOString(),
          }}
          pending
        />
      )}
    </div>
  );
}

function Bubble({ message, pending = false }: { message: Message; pending?: boolean }) {
  const isUser = message.role === 'user';
  const isMedia = message.artifact && ['image', 'audio', 'video'].includes(message.artifact.kind);

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          isUser
            ? 'max-w-[80%] rounded-2xl bg-grad-coral text-white shadow-brand-coral px-4 py-3'
            : 'max-w-[80%] rounded-2xl bg-surface text-ink border border-hairline px-4 py-3'
        }
      >
        {message.tool && message.tool !== 'chat' && !isUser && (
          <div className="text-[10px] uppercase tracking-[0.10em] font-bold opacity-60 mb-1">
            {message.tool}
          </div>
        )}
        <div className={`text-[14px] leading-relaxed whitespace-pre-wrap ${pending ? 'italic opacity-60' : ''}`}>
          {message.content}
        </div>
        {isMedia && message.artifact && (
          <div className="mt-2 text-[11px] opacity-75">
            → preview shown on the right pane
          </div>
        )}
        {message.stars_charged > 0 && (
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.10em] opacity-60">
            −{message.stars_charged}★
          </div>
        )}
      </div>
    </div>
  );
}
