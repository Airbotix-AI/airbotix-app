// Segmented control to switch the Playground between its two layout modes:
// floating Windows vs. fixed Split. Lives top-right of the workspace; the
// active segment is filled in brand-sky (see docs/mockup-workspace.png).

import clsx from 'clsx';
import { Columns2, LayoutGrid, type LucideIcon } from 'lucide-react';

import { usePlaygroundStore, type LayoutMode } from './playgroundStore';

interface Segment {
  mode: LayoutMode;
  label: string;
  Icon: LucideIcon;
}

const SEGMENTS: readonly Segment[] = [
  { mode: 'window', label: 'Windows', Icon: LayoutGrid },
  { mode: 'split', label: 'Split', Icon: Columns2 },
];

export function LayoutToggle() {
  const layoutMode = usePlaygroundStore((s) => s.layoutMode);
  const setLayoutMode = usePlaygroundStore((s) => s.setLayoutMode);

  return (
    <div className="inline-flex h-7 items-center gap-0.5 rounded-full border border-pg-border bg-pg-text/5 p-0.5">
      {SEGMENTS.map(({ mode, label, Icon }) => {
        const active = layoutMode === mode;
        return (
          <button
            key={mode}
            type="button"
            aria-pressed={active}
            onClick={() => setLayoutMode(mode)}
            className={clsx(
              'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] leading-none transition-colors',
              active
                ? 'bg-brand-sky font-extrabold text-ink'
                : 'font-semibold text-pg-text-dim hover:text-pg-text',
            )}
          >
            <Icon size={15} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
