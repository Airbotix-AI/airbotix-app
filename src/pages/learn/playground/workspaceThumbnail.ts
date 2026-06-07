// Captures a thumbnail of the whole game-studio workspace for the Projects list.
//
// The game runs in an opaque-origin sandboxed iframe (no allow-same-origin — see
// the folder CLAUDE.md security model), so a DOM-snapshot tool cannot read inside
// it. We therefore composite: html-to-image captures the studio chrome (windows,
// editor, panels — the iframe itself renders blank), then we paint the game's own
// canvas — captured FROM INSIDE the frame via the postMessage control channel —
// into the iframe's rectangle. The result is downscaled to a small JPEG so it fits
// comfortably in IndexedDB and loads fast in the list.

/** Longest edge of the stored thumbnail (px). Keeps the data URL small. */
const THUMB_MAX_EDGE = 480;
const THUMB_QUALITY = 0.72;
/** How long to wait for the in-frame snapshot before giving up (chrome-only). */
const SNAPSHOT_TIMEOUT_MS = 1200;

/** Ask the sandboxed game frame for a PNG of its canvas (null if absent/slow). */
function requestGameSnapshot(iframe: HTMLIFrameElement): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      resolve(v);
    };
    const onMessage = (e: MessageEvent) => {
      const m = e.data as { __airbotixSnapshot?: boolean; dataUrl?: string | null } | undefined;
      if (m && m.__airbotixSnapshot === true) finish(m.dataUrl ?? null);
    };
    window.addEventListener('message', onMessage);
    try {
      iframe.contentWindow?.postMessage({ __airbotixControl: true, action: 'snapshot' }, '*');
    } catch {
      finish(null);
    }
    setTimeout(() => finish(null), SNAPSHOT_TIMEOUT_MS);
  });
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Downscale a canvas so its longest edge is `maxEdge`, return a JPEG data URL. */
function downscaleToDataUrl(src: HTMLCanvasElement, maxEdge: number): string | null {
  const scale = Math.min(1, maxEdge / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(src, 0, 0, w, h);
  return out.toDataURL('image/jpeg', THUMB_QUALITY);
}

/**
 * Capture a composited thumbnail of the workspace `root` element.
 * Returns a JPEG data URL, or null if the capture failed (caller keeps the old
 * thumbnail / the placeholder). Never throws.
 */
export async function captureWorkspaceThumbnail(root: HTMLElement): Promise<string | null> {
  try {
    // Game canvas first (cheap, async round-trip), while the chrome is still mounted.
    const iframe = root.querySelector<HTMLIFrameElement>('iframe[data-game-frame]');
    const gameImgSrc = iframe ? await requestGameSnapshot(iframe) : null;

    // The chrome. Skipping the iframe avoids a slow blank-render of foreign content;
    // we paint the real game over its rect below. html-to-image is lazy-loaded —
    // it's only needed on this rare leave path, so it stays out of the main bundle.
    const { toCanvas } = await import('html-to-image');
    const canvas = await toCanvas(root, {
      cacheBust: true,
      pixelRatio: 1,
      filter: (node) => !(node instanceof HTMLIFrameElement),
    });

    if (gameImgSrc && iframe) {
      const gameImg = await loadImage(gameImgSrc);
      if (gameImg) {
        const rRoot = root.getBoundingClientRect();
        const rIf = iframe.getBoundingClientRect();
        const sx = canvas.width / rRoot.width;
        const sy = canvas.height / rRoot.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(
          gameImg,
          (rIf.left - rRoot.left) * sx,
          (rIf.top - rRoot.top) * sy,
          rIf.width * sx,
          rIf.height * sy,
        );
      }
    }

    return downscaleToDataUrl(canvas, THUMB_MAX_EDGE);
  } catch {
    return null;
  }
}
