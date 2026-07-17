// Empty-state picker shown when the kid clicks "+ New chat" or first opens
// the Workspace with no sessions. Picking a card creates a new session bound
// to that studio — the chat that follows can only use that one tool.

import clsx from 'clsx';
import { Link } from 'react-router-dom';

import { STUDIO_BY_ID, STUDIOS, type Studio } from './studios';

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
          {/* Music lives on its OWN immersive surface (/learn/music, D-MS7) — the
              card stays HERE for discoverability ("what do you want to make?"
              must include music), but picking it navigates to the Stage instead
              of opening a chat-shell session. */}
          <Link
            to="/learn/music"
            data-testid="studio-pick-music"
            className={clsx(
              'group rounded-2xl border-2 border-hairline bg-canvas-pure p-5 text-left transition-all',
              'hover:-translate-y-0.5 hover:shadow-card-soft hover:border-ink/20',
            )}
          >
            <div className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold', `bg-${STUDIO_BY_ID.music.wash}`)}>
              <span className="text-[16px]">{STUDIO_BY_ID.music.emoji}</span>
              <span className="text-ink">{STUDIO_BY_ID.music.label}</span>
              <span className="text-ink-soft">−{STUDIO_BY_ID.music.cost}★</span>
            </div>
            <div className="mt-3 text-[16px] font-bold text-ink">{STUDIO_BY_ID.music.tagline}</div>
            <ul className="mt-2 space-y-1 text-[12px] text-ink-soft">
              {STUDIO_BY_ID.music.examples.slice(0, 2).map((ex) => (
                <li key={ex} className="truncate">· {ex}</li>
              ))}
            </ul>
            <div className="mt-2 text-[11px] font-bold text-brand-mint">🎤 Opens your own stage →</div>
          </Link>
          {STUDIOS.filter((s) => s.id !== 'music' && !s.comingSoon).map((s) => (
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

        {/* Paused studios (studios.ts `comingSoon`, learn PRD v0.7): shown so the
            answer to "what do you want to make?" still includes them, but no new
            session can start — plain non-interactive cards. */}
        <div className="mt-8" data-testid="studio-coming-soon">
          <div className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-soft mb-3">
            Coming soon
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {STUDIOS.filter((s) => s.comingSoon).map((s) => (
              <div
                key={s.id}
                data-testid={`studio-coming-soon-${s.id}`}
                aria-disabled="true"
                className="rounded-2xl border-2 border-dashed border-hairline bg-canvas-pure p-4 opacity-60 saturate-50 select-none"
              >
                <div className={clsx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[12px] font-bold', `bg-${s.wash}`)}>
                  <span className="text-[16px]">{s.emoji}</span>
                  <span className="text-ink">{s.label}</span>
                </div>
                <div className="mt-2 text-[13px] font-bold text-ink">{s.tagline}</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.10em] text-ink-soft">
                  Coming soon
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
