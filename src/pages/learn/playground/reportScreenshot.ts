// Screenshot evidence capture for the RunReport (D-HARN-21b, frontend half).
//
// When the backend asks for it (`screenshot_requested` on the verification
// payload), `useVerification` calls {@link captureReportScreenshot}: it asks the
// live sandboxed game frame for a snapshot over the existing postMessage control
// channel — the frame replies COMPOSITED (canvas + overlay DOM) when overlay.html
// is present, the raw canvas otherwise — then downscales it to a small JPEG and
// measures it for the wire shape (`runReport.RunReportScreenshot`).
//
// Failure posture (non-negotiable): a screenshot bug must NEVER fail a kid's
// run. Every path here resolves `undefined`/`null` instead of throwing, is
// bounded by a short timeout, and the caller omits the field and posts the
// report anyway.

import { isSnapshotMessage } from './buildGamePreview';
import {
  MAX_SCREENSHOT_DATAURL_CHARS,
  SCREENSHOT_DATAURL_RE,
  SCREENSHOT_MAX_DIM,
  SCREENSHOT_MIN_DIM,
  type RunReportScreenshot,
} from './runReport';

/** Longest edge of the attached screenshot (px) — evidence, not artwork. */
export const SCREENSHOT_MAX_EDGE = 480;
/** JPEG quality for the downscale (matches the workspace thumbnail's). */
const SCREENSHOT_JPEG_QUALITY = 0.72;
/** How long to wait for the in-frame snapshot before giving up (ms). Short so
 *  verification never hangs on a wedged frame. */
export const SCREENSHOT_TIMEOUT_MS = 1500;

/**
 * Pure downscale math: scale (never upscale) so the longest edge is
 * ≤ {@link SCREENSHOT_MAX_EDGE}. Null when the source is degenerate or the
 * result would leave the wire-legal 16–1024 range — the caller then omits the
 * screenshot rather than post an invalid one.
 */
export function screenshotDims(
  width: number,
  height: number,
): { width: number; height: number } | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = Math.min(1, SCREENSHOT_MAX_EDGE / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  if (w < SCREENSHOT_MIN_DIM || h < SCREENSHOT_MIN_DIM) return null;
  if (w > SCREENSHOT_MAX_DIM || h > SCREENSHOT_MAX_DIM) return null;
  return { width: w, height: h };
}

/** True when the prepared screenshot satisfies the frozen wire contract. */
export function isWireLegalScreenshot(shot: RunReportScreenshot): boolean {
  return (
    SCREENSHOT_DATAURL_RE.test(shot.dataUrl) &&
    shot.dataUrl.length <= MAX_SCREENSHOT_DATAURL_CHARS &&
    Number.isInteger(shot.width) &&
    Number.isInteger(shot.height) &&
    shot.width >= SCREENSHOT_MIN_DIM &&
    shot.width <= SCREENSHOT_MAX_DIM &&
    shot.height >= SCREENSHOT_MIN_DIM &&
    shot.height <= SCREENSHOT_MAX_DIM
  );
}

/**
 * Ask the sandboxed game frame for a snapshot over the control channel (the
 * SAME `snapshot` action the workspace thumbnail uses). Resolves the reply's
 * dataUrl — composited when the game has an overlay — or null if the frame
 * never answers within `timeoutMs`.
 */
export function requestFrameSnapshot(
  iframe: HTMLIFrameElement,
  timeoutMs = SCREENSHOT_TIMEOUT_MS,
): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      resolve(v);
    };
    const onMessage = (e: MessageEvent) => {
      if (isSnapshotMessage(e.data)) finish(e.data.dataUrl ?? null);
    };
    window.addEventListener('message', onMessage);
    try {
      iframe.contentWindow?.postMessage({ __airbotixControl: true, action: 'snapshot' }, '*');
    } catch {
      finish(null);
    }
    setTimeout(() => finish(null), timeoutMs);
  });
}

/** Decode a dataUrl into an Image — null on error, and BOUNDED (an environment
 *  that never fires load/error, or a wedged decode, must not hang verification). */
function loadImage(src: string, timeoutMs = SCREENSHOT_TIMEOUT_MS): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: HTMLImageElement | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const img = new Image();
    img.onload = () => finish(img);
    img.onerror = () => finish(null);
    img.src = src;
    setTimeout(() => finish(null), timeoutMs);
  });
}

/**
 * Decode + downscale a raw snapshot dataUrl into the wire shape (≤480px longest
 * edge, JPEG). Null on ANY failure: decode error/timeout, degenerate dims, no
 * 2D context, or an encode that misses the wire contract (e.g. still oversize).
 */
export async function toReportScreenshot(
  rawDataUrl: string,
  timeoutMs = SCREENSHOT_TIMEOUT_MS,
): Promise<RunReportScreenshot | null> {
  try {
    const img = await loadImage(rawDataUrl, timeoutMs);
    if (!img) return null;
    const dims = screenshotDims(img.width, img.height);
    if (!dims) return null;
    const canvas = document.createElement('canvas');
    canvas.width = dims.width;
    canvas.height = dims.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, dims.width, dims.height);
    const shot: RunReportScreenshot = {
      dataUrl: canvas.toDataURL('image/jpeg', SCREENSHOT_JPEG_QUALITY),
      width: dims.width,
      height: dims.height,
    };
    return isWireLegalScreenshot(shot) ? shot : null;
  } catch {
    return null;
  }
}

/**
 * Capture the screenshot evidence for the report being posted: find the live
 * game frame (the SAME `data-game-frame` hook the workspace thumbnail uses —
 * both layouts mount exactly one), snapshot it, downscale. `undefined` on ANY
 * failure so the caller simply omits the field.
 */
export async function captureReportScreenshot(): Promise<RunReportScreenshot | undefined> {
  try {
    const iframe = document.querySelector<HTMLIFrameElement>('iframe[data-game-frame]');
    if (!iframe) return undefined;
    const raw = await requestFrameSnapshot(iframe);
    if (!raw) return undefined;
    return (await toReportScreenshot(raw)) ?? undefined;
  } catch {
    return undefined;
  }
}
