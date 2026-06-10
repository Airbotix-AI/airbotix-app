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
 * Pull the real runtime errors out of the captured console. Keeps only
 * `error`-level lines (drops logs/warnings + the shim's "ready" handshake),
 * formats each as `text (loc)`, de-dupes, and caps the count.
 */
export function extractRuntimeErrors(lines: ConsoleLine[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    if (l.level !== 'error') continue
    const text = (l.text ?? '').trim()
    if (!text || NON_ERROR_TEXT.has(text)) continue
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
