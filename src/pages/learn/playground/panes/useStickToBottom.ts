// Stick-to-bottom state machine for the chat list (Gap A — see
// docs/chat-ux-design.md §2.1). The reply is a client-side replay, so content
// changes fire ~50×/sec during a turn; this hook keeps the cost down and avoids
// the "yank the kid back down mid-read" bug.
//
// State machine:
//   pinned  ──content changes──▶ glue view to bottom (instant, before paint)
//   pinned  ──scroll up────────▶ released (stop auto-following)
//   released ──content changes─▶ surface the "↓ New stuff!" pill
//   released ──scroll to bottom▶ pinned again, pill cleared
//   pill ──tap (jumpToBottom)──▶ smooth-scroll to bottom, re-pin, pill cleared
//
// Cheap-check rule: the scroll handler only READS scrollTop/clientHeight/
// scrollHeight (no forced reflow, never writes layout). The glue runs in a
// useLayoutEffect so streaming tokens don't visibly lag.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

/** Within this many px of the bottom counts as "pinned". */
const BOTTOM_THRESHOLD_PX = 40;

export interface StickToBottom {
  /** Attach to the scrollable message container. */
  listRef: RefObject<HTMLDivElement>;
  /** Is the user currently pinned to (within THRESHOLD px of) the bottom? */
  atBottom: boolean;
  /** Should the floating "new messages" pill be shown? */
  showJump: boolean;
  /** Smooth-scroll to the bottom and re-pin. */
  jumpToBottom: () => void;
}

/** True when `el` is scrolled to within `BOTTOM_THRESHOLD_PX` of its bottom. */
function isAtBottom(el: HTMLDivElement): boolean {
  return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX;
}

/**
 * Stick-to-bottom + "new messages" pill for a scrollable chat list.
 *
 * @param dep  A value that changes whenever chat content changes (e.g. a render
 *             token derived from the chat array length + the last bubble's text).
 *             When it changes: if pinned, glue to bottom; else surface the pill.
 */
export function useStickToBottom(dep: unknown): StickToBottom {
  const listRef = useRef<HTMLDivElement>(null);
  // Start pinned to the bottom (atBottom true, no pill) on first mount.
  const [atBottom, setAtBottom] = useState(true);
  const [showJump, setShowJump] = useState(false);

  // Ref mirror so the dep-keyed layout effect reads the CURRENT pinned state
  // without re-running on every atBottom flip (and without a stale closure).
  const atBottomRef = useRef(atBottom);
  atBottomRef.current = atBottom;

  // Recompute `atBottom` cheaply on every scroll (read-only — no layout write).
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => setAtBottom(isAtBottom(el));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Scrolling back down to the bottom clears the pill.
  useEffect(() => {
    if (atBottom) setShowJump(false);
  }, [atBottom]);

  // On content change: glue if pinned (instant, before paint so there's no
  // visible jump and streaming tokens don't lag), else surface the pill.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (atBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    } else {
      setShowJump(true);
    }
  }, [dep]);

  const jumpToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    setShowJump(false);
  }, []);

  return { listRef, atBottom, showJump, jumpToBottom };
}
