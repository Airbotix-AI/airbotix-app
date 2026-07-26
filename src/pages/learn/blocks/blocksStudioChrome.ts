// Studio chrome: tuning constants, the page-scroll lock a live drag needs, the
// read-only treatment and the zone name tags.
//
// Split out of BlocksStudioPage.tsx to work towards the 1000-line hard rule in
// rules/file-organization.md. Everything here is stateless and shared by the
// studio's drag subsystems, so it moves without touching behaviour.

export const SAVE_DEBOUNCE_MS = 800;

// ── block drag tuning (touch-first) ──────────────────────────────────────────
// On a tablet a finger that starts on a block must be free to SCROLL the list;
// only a deliberate HOLD lifts the block to drag. So: touch waits for a short
// long-press (and cancels if the finger moves first = a scroll); mouse starts
// on a tiny move threshold. While a drag is active we lock page scrolling with a
// non-passive touchmove listener (touch-action alone can't be flipped mid-touch).
export const LONGPRESS_MS = 180;
export const TOUCH_CANCEL_PX = 12; // finger travels this far before the hold fires → it's a scroll
export const MOUSE_DRAG_PX = 6; // mouse moves this far → start dragging

const preventTouchMove = (e: TouchEvent) => {
  if (e.cancelable) e.preventDefault();
};

export function lockTouchScroll() {
  document.addEventListener('touchmove', preventTouchMove, { passive: false });
}

export function unlockTouchScroll() {
  document.removeEventListener('touchmove', preventTouchMove);
}

export type SaveStatus = 'saved' | 'saving' | 'offline';

// Teacher read-only viewer (D-LV-6): edit controls are RENDERED-but-DISABLED, not
// hidden, so the read-only layout is byte-for-byte the kid's (no empty bands, no
// missing palette). Edit controls get this consistent inert + dimmed treatment;
// the CONTENT the teacher is viewing (stage, characters, script chain, page
// thumbnails) stays full-opacity. Mutation handlers are already store-gated.
export const READONLY_EDIT_DISABLED = 'pointer-events-none cursor-default opacity-60';
