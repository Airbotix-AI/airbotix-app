// Empty-state picker shown when the kid clicks "+ New chat" or first opens
// the Workspace with no sessions. Picking a card creates a new session bound
// to that studio — the chat that follows can only use that one tool.

import clsx from 'clsx';

import { STUDIOS, type Studio } from './studios';

export function StudioPicker({
  onPick,
  busy,
}: {
  onPick: (studio: Studio) => void;
  busy: boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-10">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-[28px] font-extrabold text-ink mb-2">
          What do you want to make with AI?
        </h2>
        <p className="text-[15px] text-ink-soft mb-8">
          Pick a studio — each one teaches you one AI skill, so you can really get good at it.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Music has left the Workspace: it is its own immersive surface
              (/learn/music, D-MS7). Offering it here would drop the kid back into
              the chat shell this move exists to get them out of. */}
          {STUDIOS.filter((s) => s.id !== 'music').map((s) => (
            <button
              key={s.id}
              disabled={busy}
              data-testid={`studio-pick-${s.id}`}
              onClick={() => onPick(s.id)}
              className={clsx(
                'group rounded-2xl border-2 border-hairline bg-canvas-pure p-5 text-left transition-all',
                'hover:-translate-y-0.5 hover:shadow-card-soft hover:border-ink/20',
                busy && 'opacity-50 cursor-wait',
              )}
            >
              <div className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold', `bg-${s.wash}`)}>
                <span className="text-[16px]">{s.emoji}</span>
                <span className="text-ink">{s.label}</span>
                <span className="text-ink-soft">−{s.cost}★</span>
              </div>
              <div className="mt-3 text-[16px] font-bold text-ink">{s.tagline}</div>
              <ul className="mt-2 space-y-1 text-[12px] text-ink-soft">
                {s.examples.slice(0, 2).map((ex) => (
                  <li key={ex} className="truncate">· {ex}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
