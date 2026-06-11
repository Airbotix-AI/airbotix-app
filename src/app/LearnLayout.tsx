import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { sendWsEvent } from '@/lib/ws';

import { LearnTopBar } from './LearnTopBar';

const HEARTBEAT_INTERVAL_MS = 10_000;

// Routes that need to render full-bleed (no centered max-width container).
// Workspace is the IDE-style 3-pane surface and must use 100% width; the
// playground is the Phaser game-studio desktop (fills the area below the nav).
const FLUID_ROUTES = ['/learn/workspace', '/learn/code', '/learn/playground', '/learn/blocks'];

// IMMERSIVE routes take over the whole viewport: NO nav bar, no page scroll —
// the surface manages its own layout (Blocks Studio, a tablet-first app). The
// hub `/learn/create/blocks` keeps the nav; only the studio `/learn/blocks/:id`
// is immersive.
const IMMERSIVE_ROUTES = ['/learn/blocks/'];

export function LearnLayout() {
  const { pathname } = useLocation();
  const fluid = FLUID_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const immersive = IMMERSIVE_ROUTES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    const tick = () => sendWsEvent('class.heartbeat', { ts: Date.now() });
    tick();
    const id = window.setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  // Immersive surfaces (Blocks Studio) own the whole viewport: lock page scroll
  // and request browser fullscreen on the first gesture. This lives in the LAYOUT
  // — which stays mounted across the studio page's re-renders/remounts (e.g. the
  // periodic auth refresh briefly swapping the route out) — and keys off the
  // route. Previously the studio component owned this, so any transient remount
  // dropped fullscreen (unmount cleanup) and re-armed the one-shot enter, making
  // it flicker out and snap back on the next tap. Keyed on `immersive`, a studio
  // remount no longer touches it. If the user/browser leaves fullscreen, we don't
  // yank them back.
  useEffect(() => {
    if (!immersive) return undefined;
    const html = document.documentElement;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = html.style.overscrollBehavior;
    document.body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    let dismissed = false; // user/browser left fullscreen → don't auto re-enter
    const enter = () => {
      if (!dismissed && !document.fullscreenElement && html.requestFullscreen) {
        void html.requestFullscreen().catch(() => undefined);
      }
    };
    const onFsChange = () => {
      if (!document.fullscreenElement) dismissed = true;
    };
    window.addEventListener('pointerdown', enter, { once: true });
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      document.body.style.overflow = prevOverflow;
      html.style.overscrollBehavior = prevOverscroll;
      window.removeEventListener('pointerdown', enter);
      document.removeEventListener('fullscreenchange', onFsChange);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [immersive]);

  return (
    <div className="flex h-full flex-col bg-canvas">
      {!immersive && <LearnTopBar />}
      <main className={immersive ? 'h-full min-h-0 overflow-hidden' : 'flex-1 overflow-y-auto'}>
        {fluid ? (
          <Outlet />
        ) : (
          <div className="mx-auto max-w-5xl px-6 py-8 md:px-10 md:py-12">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}
