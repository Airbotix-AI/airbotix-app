// Bottom taskbar / dock for the Playground "Window" layout mode.
//
// A 56px-tall dark bar pinned to the bottom of the workspace (see
// docs/mockup-workspace-v2.png): a "playground" brand on the left, the
// LayoutToggle, then one button per window. Each button restores/focuses or
// minimizes its window; the active (topmost, open, non-minimized) window is
// highlighted in a sky tint, open-but-not-active windows read neutral, and
// minimized/closed windows are dimmed.
//
// Surfaces use the themeable pg-* tokens (pg-surface dock, pg-surface-2 button,
// pg-border) so the bar flips light/dark with the rest of the playground; the
// active window button carries its OWN brand identity (chat=sky, code=mint,
// game=coral — `WINDOW_ACCENT`), matching the desktop tiles and the mockup.

import clsx from 'clsx';
import { Check, CloudOff, Loader2 } from 'lucide-react';

import { LayoutToggle } from '../LayoutToggle';
import { useSaveStatusStore, type SaveStatus } from '../saveStatusStore';
import { ShareLinkPanel } from '../ShareLinkPanel';
import { ThemeToggle } from '../ThemeToggle';
import { usePlaygroundStore, type PgWindowId } from '../playgroundStore';
import { useDemoMode } from '@/pages/try/demoMode';

import { WINDOW_ACCENT, WINDOW_META, WINDOW_ORDER } from './windowMeta';

// Kid-readable save reassurance (PRD J3). 'conflict' is NEVER surfaced — a stale
// save reads as keeping their newest copy.
const SAVE_LABEL: Record<Exclude<SaveStatus, 'idle'>, string> = {
  saving: 'Saving…',
  saved: 'All saved ✓',
  queued: 'Saved on this device',
  'kept-newest': 'We kept your newest copy',
};

function SaveStatusBadge() {
  const status = useSaveStatusStore((s) => s.status);
  if (status === 'idle') return null;
  return (
    <span
      data-testid="save-status"
      data-status={status}
      className="inline-flex items-center gap-1.5 text-[12px] font-bold text-pg-text-dim"
    >
      {status === 'saving' && <Loader2 size={13} aria-hidden className="animate-spin text-brand-sky" />}
      {status === 'saved' && <Check size={13} aria-hidden className="text-brand-mint" />}
      {(status === 'queued' || status === 'kept-newest') && (
        <CloudOff size={13} aria-hidden className="text-pg-text-muted" />
      )}
      {SAVE_LABEL[status]}
    </span>
  );
}

interface TaskbarProps {
  /** The real backend project — gates the share-link control (J8). */
  projectId?: string;
}

export function Taskbar({ projectId }: TaskbarProps) {
  // Try-demo (D-DEMO-09): the playground demo runs project-less, so it supplies a
  // fixed share project id here to surface the REAL Share button (the in-memory
  // share adapter intercepts its calls). `null` (off) everywhere else.
  const demoShareProjectId = useDemoMode()?.shareProjectId;
  const shareProjectId = projectId ?? demoShareProjectId;
  const theme = usePlaygroundStore((s) => s.theme);
  const windows = usePlaygroundStore((s) => s.windows);
  const layoutMode = usePlaygroundStore((s) => s.layoutMode);
  const openOrFocus = usePlaygroundStore((s) => s.openOrFocus);
  const minimize = usePlaygroundStore((s) => s.minimize);

  // Active window = the open, non-minimized window with the highest zIndex.
  let activeId: PgWindowId | null = null;
  let activeZ = -Infinity;
  for (const id of WINDOW_ORDER) {
    const w = windows[id];
    if (w.open && !w.minimized && w.zIndex > activeZ) {
      activeZ = w.zIndex;
      activeId = id;
    }
  }

  const handleClick = (id: PgWindowId) => {
    const w = windows[id];
    if (!w.open || w.minimized) {
      openOrFocus(id); // restore / reopen + focus
    } else if (id === activeId) {
      minimize(id); // toggle: hide the focused window
    } else {
      openOrFocus(id); // bring an open background window to front
    }
  };

  return (
    <div className="flex h-14 items-center gap-2 border-t border-pg-border bg-pg-surface px-4">
      {/* Airbotix brand mark (the logo used across the site) + surface name.
          Theme-aware: black on light, white on dark. */}
      <div className="flex items-center gap-2.5 pr-2">
        <img
          src={theme === 'dark' ? '/logo-white-horizontal.png' : '/logo-black-horizontal.png'}
          alt="Airbotix"
          draggable={false}
          className="h-6 w-auto select-none"
        />
        <span aria-hidden className="h-5 w-px bg-pg-border" />
        <span className="text-[13px] font-bold text-pg-text-dim">Playground</span>
      </div>

      <LayoutToggle />
      <ThemeToggle />

      {layoutMode === 'window' && (
        <div className="flex items-center gap-2 pl-2">
          {WINDOW_ORDER.filter((id) => windows[id].open).map((id) => {
            const w = windows[id];
            const { title, Icon } = WINDOW_META[id];
            const accent = WINDOW_ACCENT[id];
            const isActive = id === activeId;
            const isVisible = w.open && !w.minimized;

            return (
              <button
                key={id}
                type="button"
                aria-label={
                  isActive
                    ? `Minimize ${title}`
                    : isVisible
                      ? `Focus ${title}`
                      : `Open ${title}`
                }
                aria-pressed={isActive}
                onClick={() => handleClick(id)}
                className={clsx(
                  'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-semibold leading-none transition-colors',
                  isActive
                    ? clsx(accent.wash, accent.border, 'text-pg-text')
                    : isVisible
                      ? 'border-pg-border bg-pg-surface-2 text-pg-text-dim hover:text-pg-text'
                      : 'border-transparent bg-transparent text-pg-text-muted hover:text-pg-text-dim',
                )}
              >
                <Icon size={18} className={isActive ? accent.icon : undefined} />
                {title}
              </button>
            );
          })}
        </div>
      )}

      {/* Right cluster: save reassurance + the external share-link control (J8,
          real backend project only). */}
      <div className="ml-auto flex items-center gap-3">
        <SaveStatusBadge />
        {shareProjectId && <ShareLinkPanel projectId={shareProjectId} />}
      </div>
    </div>
  );
}
