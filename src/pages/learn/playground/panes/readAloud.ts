// Read-aloud for the rescue path (learn-game-studio-prd §11g / J13). A non-reading
// or distressed child must not be left to silently parse text — the deflection +
// crisis resource can be spoken. Uses the browser's built-in Web Speech API
// (`speechSynthesis`); no network, no LLM, no PII leaves the device. A no-op (and
// reports unsupported) where the API is absent, so the button can hide gracefully.

/** True when the browser can speak (so the caller can hide the control). */
export function canReadAloud(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Speak `text` once, cancelling anything already speaking. Safe to call freely. */
export function readAloud(text: string): void {
  if (!canReadAloud()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  // A calm, unhurried pace for the rescue path — not the default rushed rate.
  utter.rate = 0.95;
  synth.speak(utter);
}

/** Stop any in-progress speech (e.g. on unmount). */
export function stopReadAloud(): void {
  if (!canReadAloud()) return;
  window.speechSynthesis.cancel();
}
