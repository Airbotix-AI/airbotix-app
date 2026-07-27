// Zone name tag for the Blocks Studio surfaces.
// Split out of BlocksStudioPage.tsx towards the 1000-line hard rule in
// rules/file-organization.md; kept in its own file so the chrome module can
// stay constants-only (react-refresh/only-export-components).

// ── zone label chip (clarity pass) ───────────────────────────────────────────
// Kids 5–8 (many pre-readers) couldn't tell what each studio area was for, so
// every zone wears a tiny emoji-first name tag. Chips are decoration only:
// pointer-events:none, aria-hidden (the zones carry matching aria-labels), and
// blocks.css hides them in present mode / while a block drag is live.
export function ZoneTag({ zone, emoji, label }: { zone: string; emoji: string; label: string }) {
  return (
    <span className={`bsx-zonetag zt-${zone}`} data-testid={`zone-${zone}`} aria-hidden>
      <span className="zt-ic">{emoji}</span>
      <span className="zt-txt">{label}</span>
    </span>
  );
}
