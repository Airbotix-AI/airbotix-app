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
//
// It also carries the `MissionStepChip` (§9A) — the current mission step, ticked
// from here without opening the Mission window. That one is deliberately NOT a
// window button: it is a status+action chip in brand mint, shown in BOTH layout
// modes (the per-window buttons are window-mode only), pinned in the LEFT cluster
// BEFORE the window-button group and fixed-width, so opening or closing a window
// can never move or resize it.

import clsx from 'clsx';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CloudOff, Home, Loader2 } from 'lucide-react';

import { LayoutToggle } from '../LayoutToggle';
import { useSaveStatusStore, type SaveStatus } from '../saveStatusStore';
import { ShareLinkPanel } from '../ShareLinkPanel';
import { ThemeToggle } from '../ThemeToggle';
import { usePlaygroundStore, type PgWindowId } from '../playgroundStore';
import { useProjectBackTo } from '../../projects/useProjectBackTo';
import { RaiseHandButton } from '../../liveClass/RaiseHandButton';
import { useDemoMode } from '@/pages/try/demoMode';

import { MissionStepChip } from './MissionStepChip';
import { WINDOW_ACCENT, WINDOW_META, WINDOW_ORDER } from './windowMeta';

// Kid-readable save reassurance (PRD J3). 'conflict' is NEVER surfaced — a stale
// save reads as keeping their newest copy.
const SAVE_LABEL: Record<Exclude<SaveStatus, 'idle'>, string> = {
  saving: 'Saving…',
  saved: 'All saved ✓',
  queued: 'Saved on this device',
  'kept-newest': 'We kept your newest copy',
  error: 'Couldn’t save',
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
      {status === 'error' && <AlertTriangle size={13} aria-hidden className="text-brand-coral" />}
      {SAVE_LABEL[status]}
    </span>
  );
}

interface TaskbarProps {
  /** The real backend project — gates the share-link control (J8). */
  projectId?: string;
  /** The Mission this project backs (D-GAME14) — gates the mission step chip. */
  missionId?: string | null;
  /** Teacher live viewer (D-LV-6): hide the kid's Home/back nav (the viewer's
      banner provides the only Back). */
  readOnly?: boolean;
  /** Teacher-prep host (D-PREP-6): the share control mints immediately, no approval. */
  prepShare?: boolean;
  /**
   * Project kind. `website` HIDES the share control until website publish lands
   * (P3, creative-code-studio-website-prd §6): the public play host renders a
   * game (`ReadOnlyGameFrame`) and the ShareLink carries no kind, so a shared
   * website would mint a DEAD public link. Interim guard — remove it when P3
   * ships the website publish path. Defaults to `game` (unchanged behaviour).
   */
  kind?: 'game' | 'website';
  /**
   * Whether Mission Mode exists for this project at all (D-GAME14h) — i.e. the mission
   * authors steps AND its course pack is published. False hides the Mission window button
   * entirely: an empty checklist window advertises structure that isn't there.
   */
  hasMission?: boolean;
}

export function Taskbar({
  projectId,
  missionId,
  hasMission = false,
  readOnly = false,
  prepShare = false,
  kind = 'game',
}: TaskbarProps) {
  // Home/back: a game has no other way out of the immersive desktop. For a class
  // project this returns to the class's "My work" tab; otherwise to My Works
  // (useProjectBackTo). Navigating runs the playground's leave/save guard.
  const homeHref = useProjectBackTo(projectId);
  // Try-demo (D-DEMO-09): the playground demo runs project-less, so it supplies a
  // fixed share project id here to surface the REAL Share button (the in-memory
  // share adapter intercepts its calls). `null` (off) everywhere else.
  const demoShareProjectId = useDemoMode()?.shareProjectId;
  // Websites can't be published yet (P3, creative-code-studio-website-prd §6) —
  // offering Share would mint a link the public play host can't render.
  const shareProjectId = kind === 'website' ? undefined : (projectId ?? demoShareProjectId);
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
      {/* Home/back — the only way out of the game playground (kid view only). */}
      {!readOnly && (
        <Link
          to={homeHref}
          data-testid="pg-home"
          aria-label="Back to my work"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-pg-border bg-pg-surface-2 px-3 text-sm font-semibold text-pg-text-dim transition-colors hover:text-pg-text"
        >
          <Home size={16} aria-hidden /> Home
        </Link>
      )}
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

      {/* The current mission step, in its OWN stable slot in the left cluster and
          in BOTH layout modes (§9A). It must sit BEFORE the window-button group —
          that group's width changes every time a window opens/closes/minimizes,
          so anything after it slides. The chip brings its own divider and renders
          nothing at all on a project with no mission checklist. */}
      <MissionStepChip projectId={projectId} missionId={missionId} readOnly={readOnly} />

      {layoutMode === 'window' && (
        <div data-testid="pg-window-buttons" className="flex items-center gap-2 pl-2">
          {WINDOW_ORDER.filter(
            (id) => windows[id].open && (id !== 'mission' || hasMission),
          ).map((id) => {
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
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <SaveStatusBadge />
        <RaiseHandButton readOnly={readOnly} />
        {shareProjectId && <ShareLinkPanel projectId={shareProjectId} prepMode={prepShare} />}
      </div>
    </div>
  );
}
