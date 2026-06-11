// The global "Magic Generation" card (PRD learn-game-studio-assets-prd §3). Shows
// the single in-flight generation from `generationStore` — pinned at the top of
// the Asset Viewer, visible from any tab, with a modern/magical animation and a
// Cancel. Two visual states: `generating` (orb + sparkles + shimmer + ✕) and
// `error` (gentle retry). The `done` reveal is handled by the pane (it opens the
// new asset). Reuses the playground.css motion (pg-orb-spin / pg-twinkle /
// pg-indeterminate); honors prefers-reduced-motion via that stylesheet.

import { Loader2, Sparkles, Wand2, X } from 'lucide-react';

import type { GenMode, GenStatus } from '../generationStore';

const SPARKS = [
  { left: '14%', top: '14%', size: 13, delay: '0s' },
  { left: '30%', top: '70%', size: 9, delay: '.5s' },
  { right: '34%', top: '20%', size: 11, delay: '.9s' },
  { right: '12%', bottom: '24%', size: 10, delay: '1.3s' },
  { left: '52%', top: '8%', size: 8, delay: '.3s' },
];

export function MagicGenerationCard({
  status,
  prompt,
  mode,
  refSrc,
  onCancel,
  onRetry,
  onDismiss,
}: {
  status: GenStatus;
  prompt: string;
  mode: GenMode;
  /** For a remix: the reference asset being varied (shown beside the orb). */
  refSrc?: string;
  onCancel: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}) {
  const isError = status === 'error';
  const verb = mode === 'remix' ? 'Remixing' : 'Conjuring';

  return (
    <div
      data-testid="asset-magic-card"
      data-status={status}
      className="mb-4 rounded-[20px] p-[2px] shadow-brand-bubblegum"
      style={{
        background: isError
          ? 'linear-gradient(120deg,#FF9A80,#FF6BA9)'
          : 'linear-gradient(120deg,#FF6BA9,#9B7BFF 42%,#5DAEFF 72%,#3DD9A9)',
      }}
    >
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-pg-surface to-pg-surface-2 p-4">
        {!isError &&
          SPARKS.map((s, i) => (
            <Sparkles
              key={i}
              className="pg-twinkle pointer-events-none absolute text-brand-bubblegum"
              size={s.size}
              style={{ ...s, animationDelay: s.delay } as React.CSSProperties}
            />
          ))}

        <div className="flex items-center gap-3.5">
          {/* the reference asset being remixed (when this is a remix) */}
          {refSrc && (
            <img
              src={refSrc}
              crossOrigin="anonymous"
              alt="reference"
              className="h-[44px] w-[44px] shrink-0 rounded-xl bg-pg-surface object-contain p-1 shadow-[0_0_0_2px_rgb(var(--pg-surface)),0_6px_16px_-6px_rgba(155,123,255,.45)]"
            />
          )}
          {/* the magic orb */}
          <div className="relative h-[58px] w-[58px] shrink-0">
            <div
              className={isError ? 'h-full w-full rounded-full' : 'pg-orb-spin h-full w-full rounded-full'}
              style={{
                background: isError
                  ? 'radial-gradient(circle at 50% 40%, #FFE2D9, #FF9A80)'
                  : 'conic-gradient(from 160deg,#FF6BA9,#FFD43B,#3DD9A9,#5DAEFF,#9B7BFF,#FF6BA9)',
                boxShadow: '0 0 0 5px rgb(var(--pg-surface)), 0 8px 22px -6px rgba(155,123,255,.6)',
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[24px]">
              {isError ? '🌧️' : '🪄'}
            </div>
          </div>

          <div className="min-w-0">
            <div className="text-[15px] font-black text-pg-text">
              {isError ? 'That fizzled — let’s try again' : `${verb} your asset…`}
            </div>
            <div className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-full border border-pg-border bg-pg-surface px-3 py-1 text-[12.5px] font-bold text-pg-text-dim">
              <Wand2 size={12} className="shrink-0 text-brand-bubblegum" />
              <span className="truncate">“{prompt}”</span>
            </div>
          </div>

          <div className="ml-auto shrink-0 self-start">
            {isError ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="asset-magic-retry"
                  onClick={onRetry}
                  className="rounded-xl bg-brand-bubblegum px-3 py-2 text-[12.5px] font-extrabold text-white"
                >
                  ↻ Try again
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="rounded-xl border border-pg-border bg-pg-surface px-3 py-2 text-[12.5px] font-bold text-pg-text-dim"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <button
                type="button"
                data-testid="asset-magic-cancel"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-pg-border bg-pg-surface px-3 py-2 text-[12.5px] font-bold text-pg-text-dim hover:bg-pg-text/5"
              >
                <X size={14} /> Cancel
              </button>
            )}
          </div>
        </div>

        {!isError && (
          <>
            <div className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-pg-text/10">
              <div
                className="pg-indeterminate absolute inset-y-0 w-1/3 rounded-full"
                style={{ background: 'linear-gradient(90deg,#FF6BA9,#9B7BFF,#5DAEFF)' }}
              />
            </div>
            <div className="mt-2.5 flex items-center gap-2 text-[11.5px] text-pg-text-muted">
              <span className="inline-flex items-center gap-1 rounded-full bg-pg-surface-2 px-2 py-0.5 font-bold text-pg-text-dim">
                <Loader2 size={11} className="animate-spin" /> usually a few seconds
              </span>
              <span>· keeps going if you close this — come back anytime</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
