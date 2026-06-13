import { MARKETING_URL, marketingHref } from '@/lib/marketing';

/**
 * Brand frame for the public play page (`/play/:shareId`). A slim bar ABOVE the
 * play surface — never an overlay, so it can't intercept a game tap or a sprite
 * tap (the surface owns 100% of the area below it). It carries AirBotix brand
 * attribution (→ marketing home) and one soft, first-party "Make your own" CTA
 * (→ marketing /try). Both open a NEW TAB so the visitor's play session is never
 * navigated away.
 *
 * This is a brand frame, NOT studio chrome: no editor/chat/console/Game-Runner
 * chrome, no auth, no LLM, no kid PII (learn-game-studio-prd.md §7 / D-GAME10e).
 * Compliance: first-party only — no third-party advertising (minors-compliance
 * C14). The container defaults to the dark theme on both game + blocks surfaces.
 */
export function PlayBrandBar() {
  return (
    <header
      data-testid="play-brand-bar"
      className="flex h-12 flex-none items-center justify-between gap-3 border-b border-white/10 bg-[#0A0A0F] px-3 sm:px-4"
    >
      <a
        data-testid="play-brand-home"
        href={MARKETING_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Made with AirBotix — visit airbotix.ai"
        className="inline-flex items-center gap-2 opacity-90 transition-opacity hover:opacity-100"
      >
        <img src="/logo-white-horizontal.png" alt="AirBotix" className="h-4 w-auto" />
        <span className="hidden text-[11px] font-medium text-white/45 sm:inline">· shared creation</span>
      </a>

      <a
        data-testid="play-make-own"
        href={marketingHref('/try')}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex flex-none items-center gap-1.5 rounded-full bg-brand-coral px-3.5 py-1.5 text-[12.5px] font-extrabold text-white shadow-brand-coral transition-transform hover:-translate-y-px"
      >
        <span aria-hidden>✨</span> Make your own
      </a>
    </header>
  );
}
