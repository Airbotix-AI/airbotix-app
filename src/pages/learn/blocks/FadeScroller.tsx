import { useEffect, useRef, type ReactNode } from 'react';

const FADE = '16px';
const EDGE_PX = 2; // within this of an end counts as "at the end" — no fade
const THUMB_HIDE_MS = 650;
const THUMB_MIN_PX = 24;
const TRACK_INSET_PX = 10; // keeps the thumb off the card's rounded corners

/**
 * Scroll area with kid-friendly scroll chrome (the studio hides native bars —
 * see blocks.css "scroll zones"):
 *  - edges fade ONLY towards hidden content (same idea as the playground's
 *    HistoryPanel fade) — at a resting end nothing ever looks cut off;
 *  - an iOS-style overlay thumb hugs the container edge while scrolling and
 *    fades away when idle.
 * Direct style mutation, not React state: scroll fires every frame and the
 * fades/thumb are pure decoration (aria-hidden, pointer-events: none).
 */
export function FadeScroller({ className = '', children }: { className?: string; children: ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const xRef = useRef<HTMLDivElement>(null);
  const yRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;

    const placeThumb = (t: HTMLDivElement | null, horiz: boolean, scrolling: boolean) => {
      if (!t) return;
      const max = horiz ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
      if (max <= EDGE_PX) {
        t.classList.remove('on');
        return;
      }
      const client = horiz ? el.clientWidth : el.clientHeight;
      const total = horiz ? el.scrollWidth : el.scrollHeight;
      const pos = horiz ? el.scrollLeft : el.scrollTop;
      const track = client - 2 * TRACK_INSET_PX;
      const size = Math.max(THUMB_MIN_PX, (client / total) * track);
      const at = (track - size) * (pos / max);
      if (horiz) {
        t.style.width = `${size}px`;
        t.style.transform = `translateX(${at}px)`;
      } else {
        t.style.height = `${size}px`;
        t.style.transform = `translateY(${at}px)`;
      }
      if (scrolling) t.classList.add('on');
    };

    const update = (scrolling: boolean) => {
      const maxX = el.scrollWidth - el.clientWidth;
      const maxY = el.scrollHeight - el.clientHeight;
      el.style.setProperty('--fl', maxX > EDGE_PX && el.scrollLeft > EDGE_PX ? FADE : '0px');
      el.style.setProperty('--fr', maxX > EDGE_PX && el.scrollLeft < maxX - EDGE_PX ? FADE : '0px');
      el.style.setProperty('--ft', maxY > EDGE_PX && el.scrollTop > EDGE_PX ? FADE : '0px');
      el.style.setProperty('--fb', maxY > EDGE_PX && el.scrollTop < maxY - EDGE_PX ? FADE : '0px');
      placeThumb(xRef.current, true, scrolling);
      placeThumb(yRef.current, false, scrolling);
      if (scrolling) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
          xRef.current?.classList.remove('on');
          yRef.current?.classList.remove('on');
        }, THUMB_HIDE_MS);
      }
    };

    update(false);
    const onScroll = () => update(true);
    el.addEventListener('scroll', onScroll, { passive: true });
    // Content/size changes (category switch, added blocks, orientation) move
    // the overflow edges without a scroll event. jsdom has no ResizeObserver.
    let ro: ResizeObserver | undefined;
    let mo: MutationObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update(false));
      ro.observe(el);
    }
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => update(false));
      mo.observe(el, { childList: true, subtree: true });
    }
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro?.disconnect();
      mo?.disconnect();
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="bsx-fwrap">
      <div ref={scrollRef} className={`bsx-fscroll ${className}`}>
        {children}
      </div>
      <div ref={xRef} className="bsx-thumb bsx-thumb-x" aria-hidden />
      <div ref={yRef} className="bsx-thumb bsx-thumb-y" aria-hidden />
    </div>
  );
}
