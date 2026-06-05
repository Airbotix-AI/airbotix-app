// Segmented control to switch the Playground between its two layout modes:
// floating Windows vs. fixed Split. Lives top-right of the workspace; the
// active segment is filled in brand-sky (see docs/mockup-workspace.png).

import clsx from 'clsx';

import { usePlaygroundStore, type LayoutMode } from './playgroundStore';

interface Segment {
  mode: LayoutMode;
  label: string;
}

const SEGMENTS: readonly Segment[] = [
  { mode: 'window', label: '⊞ Windows' },
  { mode: 'split', label: '◫ Split' },
];

export function LayoutToggle() {
  const layoutMode = usePlaygroundStore((s) => s.layoutMode);
  const setLayoutMode = usePlaygroundStore((s) => s.setLayoutMode);

  return (
    <div className="inline-flex h-7 items-center gap-0.5 rounded-full border border-canvas-pure/10 bg-canvas-pure/5 p-0.5">
      {SEGMENTS.map(({ mode, label }) => {
        const active = layoutMode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => setLayoutMode(mode)}
            className={clsx(
              'h-6 rounded-full px-2.5 text-[11px] leading-none transition-colors',
              active
                ? 'bg-brand-sky font-extrabold text-ink'
                : 'font-semibold text-stone2 hover:text-canvas-pure',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
