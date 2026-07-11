import clsx from 'clsx';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

export interface SessionRow {
  id: string;
  studio: 'image' | 'music' | 'voice' | 'video' | 'chat' | 'mission' | null;
  started_at: string;
  stars_used: number;
  artifacts_count: number;
  llm_calls: number;
  ended_at: string | null;
}

const TOOL_EMOJI: Record<string, string> = {
  chat: '💬',
  image: '🎨',
  music: '🎵',
  voice: '🔊',
  video: '🎬',
  mission: '🚀',
};

export function SessionsPane({
  sessions,
  loading,
  activeId,
  onPick,
  onNew,
}: {
  sessions: SessionRow[];
  loading: boolean;
  activeId: string | null;
  onPick: (id: string) => void;
  onNew: () => void;
}) {
  const groups = useMemo(() => bucket(sessions), [sessions]);

  return (
    <aside className="w-64 shrink-0 bg-canvas-pure flex flex-col">
      <div className="p-4 border-b border-hairline">
        <button onClick={onNew} className="btn-pill-primary w-full">✨ Make something</button>
        <Link
          to="/learn/create/blocks"
          data-testid="workspace-story-blocks"
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border-2 border-brand-mint/40 bg-wash-mint px-4 py-2 text-[13px] font-bold text-ink transition hover:-translate-y-0.5 hover:border-brand-mint"
        >
          <span aria-hidden="true">🌟</span>
          Story Blocks
          <span className="text-[10px] font-semibold text-ink-soft">Ages 5–8</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {loading && <p className="lead-text text-center mt-8" style={{ fontSize: '13px' }}>Loading…</p>}
        {!loading && sessions.length === 0 && (
          <p className="text-[12px] text-slate2 text-center mt-8">
            No sessions yet. Type something to start.
          </p>
        )}
        {(['Today', 'Yesterday', 'Earlier'] as const).map((label) =>
          groups[label].length > 0 ? (
            <div key={label} className="mb-4">
              <div className="text-[10px] uppercase tracking-[0.10em] text-slate2 font-bold px-3 mb-1">
                {label}
              </div>
              <ul className="space-y-0.5">
                {groups[label].map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => onPick(s.id)}
                      className={clsx(
                        'w-full text-left rounded-2xl px-3 py-2 text-[13px] transition-colors',
                        s.id === activeId
                          ? 'bg-wash-coral text-ink font-semibold'
                          : 'text-ink-soft hover:bg-surface hover:text-ink',
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span>{TOOL_EMOJI[s.studio ?? 'chat'] ?? '💬'}</span>
                        <span className="truncate">{labelFor(s)}</span>
                      </div>
                      <div className="text-[10px] text-slate2 mt-0.5 flex gap-2">
                        <span>{s.artifacts_count} made</span>
                        <span>·</span>
                        <span>{s.stars_used}★</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </aside>
  );
}

function bucket(rows: SessionRow[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yest = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const out = { Today: [] as SessionRow[], Yesterday: [] as SessionRow[], Earlier: [] as SessionRow[] };
  for (const r of rows) {
    const t = new Date(r.started_at);
    if (t >= today) out.Today.push(r);
    else if (t >= yest) out.Yesterday.push(r);
    else out.Earlier.push(r);
  }
  return out;
}

function labelFor(s: SessionRow): string {
  const studio = s.studio ?? 'chat';
  const dt = new Date(s.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `${studio.charAt(0).toUpperCase() + studio.slice(1)} · ${dt}`;
}
