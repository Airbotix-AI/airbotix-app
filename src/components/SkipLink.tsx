// "Skip to content" — the first focusable element on every surface. Hidden until
// focused, then lets keyboard / screen-reader users jump past the nav straight to
// <main id="main-content">. WCAG 2.4.1 Bypass Blocks (Level A).
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only rounded-full bg-brand-coral px-5 py-2.5 font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
    >
      Skip to content
    </a>
  );
}
