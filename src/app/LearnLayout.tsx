import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { useKidToken } from '@/auth/authStore';
import { sendWsEvent } from '@/lib/ws';
import { NudgeBanner } from '@/pages/learn/liveClass/NudgeBanner';
import { reEmitFocus } from '@/pages/learn/liveClass/reportFocus';

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
const IMMERSIVE_ROUTES = ['/learn/blocks/', '/learn/music'];

// Of the immersive surfaces, only the tablet-first Blocks Studio ALSO asks the
// browser for OS fullscreen on the first tap. The Music Stage is immersive
// (no nav, no page scroll) but stays a normal browser page — a desktop kid
// composing a song shouldn't have their whole browser hijacked into fullscreen
// (user decision, music-stage-prd D-MS7 refinement).
const AUTO_FULLSCREEN_ROUTES = ['/learn/blocks/'];

export function LearnLayout() {
  const { pathname } = useLocation();
  const immersive = IMMERSIVE_ROUTES.some((p) => pathname.startsWith(p));
  // Immersive IMPLIES full-bleed. Listing a route as immersive but forgetting the
  // FLUID list hid the nav and locked page scroll while still wrapping the surface
  // in the centered max-w-5xl box — a "fullscreen" studio letterboxed inside a
  // reading column. There is no case where an immersive surface wants that box.
  const fluid =
    immersive || FLUID_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Depend on the kid token so the FIRST heartbeat (which lazily creates + connects
  // the kid socket via getSocket) fires the moment auth lands — not up to 10s later
  // — and reconnects on token rotation. Without this, the bootstrap refresh resolves
  // after mount and the socket stays down until the next interval tick.
  const kidToken = useKidToken();
  useEffect(() => {
    const tick = () => {
      sendWsEvent('class.heartbeat', { ts: Date.now() });
      // Re-emit the kid's currently-open project (D-LIVE-3) so a teacher who
      // opens Live Mode mid-session syncs within ~10s. No-op when nothing open.
      reEmitFocus();
    };
    tick();
    const id = window.setInterval(tick, HEARTBEAT_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [kidToken]);

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
    return () => {
      document.body.style.overflow = prevOverflow;
      html.style.overscrollBehavior = prevOverscroll;
    };
  }, [immersive]);

  // OS fullscreen on the first gesture — Blocks Studio only (tablet-first).
  // The Music Stage is immersive but must NOT hijack the browser into
  // fullscreen; see AUTO_FULLSCREEN_ROUTES above.
  const autoFullscreen = AUTO_FULLSCREEN_ROUTES.some((p) => pathname.startsWith(p));
  useEffect(() => {
    if (!autoFullscreen) return undefined;
    const html = document.documentElement;
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
      window.removeEventListener('pointerdown', enter);
      document.removeEventListener('fullscreenchange', onFsChange);
      if (document.fullscreenElement) void document.exitFullscreen?.().catch(() => undefined);
    };
  }, [autoFullscreen]);

  return (
    <div className="flex h-full flex-col bg-canvas">
      {/* One-way teacher nudge banner (D-LIVE-2) — hosted here (like the heartbeat)
          so it surfaces across every Learn surface, including immersive studios. */}
      <NudgeBanner />
      {!immersive && <LearnTopBar />}
      {/* Immersive main is flex-1, NOT h-full: h-full is 100% of the whole layout
          column, so the moment something renders above it (the NudgeBanner — which
          deliberately surfaces over studios) the studio was pushed down and its
          bottom bar clipped off-screen by exactly the banner height. flex-1 hands
          the studio the space that is actually left. */}
      <main className={immersive ? 'min-h-0 flex-1 overflow-hidden' : 'flex-1 overflow-y-auto'}>
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
