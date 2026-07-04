import type { ConsoleLine } from './buildGamePreview'

// Self-verify round-trip helpers (playground-ai-prompt-prd.md MP3 / D-PAP-09,13,23).
// After the studio runs a just-applied game, the sandbox console is the only signal
// of a runtime error (the game runs in the opaque-origin iframe, not the app). These
// pure helpers turn captured console lines into the error list reported to the
// backend auto-fix endpoint — kept out of the component so they're unit-testable.

/** Console lines the shim emits before any real error — never a "bug" to fix. */
const NON_ERROR_TEXT = new Set(['ready'])
/** Cap reported errors so a noisy console can't blow the request / prompt budget. */
const MAX_REPORTED_ERRORS = 6

/**
 * CURATED warn-level failure signatures (D-PAP-41). Engines report real breakage
 * via `console.warn` — Phaser's missing textures / "Scene not found", the loader
 * guard's `[airbotix]` lines — so these specific patterns count as failures. The
 * list is an ALLOWLIST on purpose: a generic kid `console.warn` must NEVER trigger
 * a Stars-charged fix turn.
 */
const FAILURE_WARN_PATTERNS: readonly RegExp[] = [
  /^\[airbotix\]/,
  /Failed to (load|process)/i,
  /Texture .*(missing|not found)/i,
  /Scene .*not found/i,
]

/** True when a warn-level line matches a curated failure signature. */
export function isFailureWarn(text: string): boolean {
  return FAILURE_WARN_PATTERNS.some((re) => re.test(text))
}

/**
 * Pull the real runtime errors out of the captured console. Keeps `error`-level
 * lines PLUS warn-level lines matching the curated failure allowlist (drops
 * logs/generic warnings + the shim's "ready" handshake), formats each as
 * `text (loc)`, de-dupes, and caps the count.
 */
export function extractRuntimeErrors(lines: ConsoleLine[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    const text = (l.text ?? '').trim()
    if (!text || NON_ERROR_TEXT.has(text)) continue
    if (l.level !== 'error' && !(l.level === 'warn' && isFailureWarn(text))) continue
    const formatted = l.loc ? `${text} (${l.loc.file}:${l.loc.line})` : text
    if (seen.has(formatted)) continue
    seen.add(formatted)
    out.push(formatted)
    if (out.length === MAX_REPORTED_ERRORS) break
  }
  return out
}

/** True when the captured console has at least one real runtime error. */
export function hasRuntimeError(lines: ConsoleLine[]): boolean {
  return extractRuntimeErrors(lines).length > 0
}
