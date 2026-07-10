// Kid-facing chat copy + the failure-envelope → copy mapping for the playground
// chat (PRD J2 / J11 / J13, D-PAP-33..48, D-HARN-02). Extracted from
// `useGameAgent` so the controller stays readable; `useGameAgent` re-exports the
// public pieces (the panel + tests import them from there).

import { ApiError } from '@/lib/api';
import { isOffline } from './gameAgent';
import { AI_UNAVAILABLE_TEXT } from './useTurnHygiene';

export const PENDING_TEXT = 'Thinking…';
/**
 * Calm "you stopped the AI" copy (D-PAP-48). Shown when the kid taps "Stop" while
 * the agent is thinking (BEFORE any reply streams): the in-flight classify/runTurn
 * fetch is aborted, the backend treats the disconnect as a clean cancel (no Stars),
 * and the pending bubble becomes this — NOT an error (the game is untouched).
 */
export const STOPPED_TEXT = 'Okay, I stopped — your game is unchanged. Tell me what to do, or try again.';
/**
 * "Can't get to the server" copy — used when the request never reached the
 * backend: `fetch` itself rejected (connection refused / DNS / CORS) so no
 * `ApiError` was produced, OR a gateway is down (502/503/504). Distinct from
 * SERVER_ERROR_TEXT so a connectivity problem reads differently from a backend
 * that WAS reached but errored (the common dev-mode "backend restarting" case).
 */
export const ERROR_TEXT = 'Could not reach the AI. Try again.';
/**
 * "The backend was reached but errored" copy (an unexpected 5xx / unhandled
 * status). The AI server answered with a failure rather than being unreachable,
 * so we don't claim we "couldn't reach" it — that misdirects debugging.
 */
export const SERVER_ERROR_TEXT = 'The AI ran into a problem. Try again in a moment.';
/** Calm, kid-framed offline copy (PRD J2 — never a frozen screen). */
export const OFFLINE_TEXT = 'Internet hiccup — your work is safe. Try again in a moment.';
/**
 * The cap-reached "ask your grown-up" copy (J11 / §11g(e)). When the parent
 * spending cap (or wallet) is hit, the backend blocks AI turns BEFORE any LLM
 * call; the kid sees this — never a dead end. Exported so the panel can tag it
 * with the `cap-message` testid without substring-matching the wording.
 */
export const CAP_MESSAGE = 'You used all the Stars for now. Ask your grown-up to add more. ⭐';

/**
 * Image-specific reject copy (D-PAP-34) — a picture failed pre-model moderation
 * (`MODERATION_REJECTED`, `details.modality:'image'`). Distinct from the text
 * reject so the kid knows it was the PICTURE, not their words, and charges no
 * Stars. The rejected image(s) are cleared by the composer (the panel watches
 * `lastImageRejected`).
 */
export const IMAGE_REJECT_MESSAGE =
  "I can't use that picture here — let's keep it kind and safe. Try a different one, or just tell me with words.";
/**
 * "Pictures aren't available right now" copy (D-PAP-37) — the dark-launch feature
 * flag is OFF, so the backend rejected the turn's images (`IMAGE_INPUT_DISABLED`).
 * No Stars charged. The composer also hides the picture button once it sees this.
 */
export const IMAGE_DISABLED_MESSAGE = "Pictures aren't available right now — tell me with words and I'll help! ✏️";
/**
 * The picture CHECKER errored copy (D-PAP-46) — the backend's fail-closed input
 * screen hit a classifier outage/timeout (`MODERATION_UNAVAILABLE`), so the
 * picture was withheld WITHOUT being judged. Distinct from IMAGE_REJECT_MESSAGE:
 * the kid's picture wasn't "unkind", so we don't say it was — and instead of the
 * reject clear (`imageRejectNonce`), the already-uploaded refs are RE-STAGED via
 * `imageRestore` so one tap retries without a re-upload. No Stars.
 */
export const IMAGE_CHECK_HICCUP_MESSAGE =
  'Our picture checker had a hiccup — nothing wrong with your picture! Try again in a moment. 🛠️';

/** Kid-framed error copy for the known backend failure envelopes (mirror code). */
export function friendlyError(e: unknown): string {
  if (isOffline()) return OFFLINE_TEXT;
  if (e instanceof ApiError) {
    if (e.code === 'WALLET_INSUFFICIENT' || e.code === 'DAILY_CAP_EXCEEDED' || e.status === 402)
      return CAP_MESSAGE;
    if (e.code === 'FAMILY_PAUSED') return 'Your family paused AI. Ask a grown-up.';
    // The dark-launch image flag is off → "pictures aren't available right now"
    // (no Stars). Distinct from a moderation reject (the picture itself was bad).
    if (e.code === 'IMAGE_INPUT_DISABLED') return IMAGE_DISABLED_MESSAGE;
    if (e.code === 'MODERATION_REJECTED') {
      // An IMAGE was rejected pre-model (D-PAP-34) reads differently from a text
      // reject, so the kid knows it was the PICTURE, not their words.
      const details = e.details as { modality?: string } | undefined;
      if (details?.modality === 'image') return IMAGE_REJECT_MESSAGE;
      return "Let's keep it kind and safe — try asking for something else.";
    }
    if (e.code === 'MODERATION_UNAVAILABLE') {
      // The safety checker itself errored (D-PAP-46) — fail-closed server-side,
      // but the content was never judged, so don't imply it was. For a picture
      // the composer keeps it staged (no reject nonce) so the kid just retries.
      const details = e.details as { modality?: string } | undefined;
      if (details?.modality === 'image') return IMAGE_CHECK_HICCUP_MESSAGE;
      return 'The safety check had a hiccup — try again in a moment.';
    }
    if (e.code === 'MODERATION_WARN')
      return 'That message looked a bit off. Try saying it a different way.';
    // The backend's kid-safe turn-failure envelope (D-HARN-02): upstream/loop
    // failures (DEEPROUTER_4xx/5xx, timeout-exhausted, TURN_FAILED) arrive as a
    // 502 with a stable `AI_UNAVAILABLE` code — check the CODE before the
    // gateway-status branch below so the taxonomy copy wins over "can't reach".
    if (e.code === 'AI_UNAVAILABLE') return AI_UNAVAILABLE_TEXT;
    // A gateway is down (the backend itself is unreachable behind a proxy) → keep
    // the "can't reach" copy; any other status means the server answered with a
    // failure → it WAS reached, so surface the distinct server-error copy.
    if (e.status === 502 || e.status === 503 || e.status === 504) return ERROR_TEXT;
    return SERVER_ERROR_TEXT;
  }
  // Not an ApiError → `fetch` rejected before any response (connection refused /
  // DNS / CORS): the backend was never reached.
  return ERROR_TEXT;
}

/**
 * True when a rejection is an aborted fetch (the kid pressed "Stop waiting",
 * D-PAP-48, or the D-HARN-03 watchdog fired). `AbortController.abort()` rejects
 * `fetch` with a `DOMException` whose `.name === 'AbortError'` — NOT an
 * `ApiError`, so it must be handled BEFORE the generic friendlyError path (an
 * abort is a clean cancel, never an error).
 */
export function isAbortError(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { name?: string }).name === 'AbortError';
}
