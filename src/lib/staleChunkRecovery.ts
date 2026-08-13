// Stale-chunk recovery. Every prod deploy replaces the CONTENT-HASHED chunks
// wholesale (deploy.yml: `aws s3 sync --delete`), so a tab opened before the
// deploy 404s the moment it lazily imports an old-hash chunk ("Failed to fetch
// dynamically imported module: …/assets/<chunk>-<oldhash>.js") and dies on the
// router error boundary. Vite surfaces exactly those failures as the
// `vite:preloadError` event — recover by reloading ONCE, so the fresh
// index.html re-links every chunk to the new hashes. The per-URL guard makes a
// SECOND failure at the same URL fall through to the error boundary instead of
// reload-looping (the failure is then real: offline, blocked, server down).
// Found live: owner manual verification 2026-08-12 (a harness container
// rebuild is a deploy; prod hits the same race on every release).

const RELOADED_KEY = "airbotix:chunk-reload";

// In-memory fallback when sessionStorage is unavailable (privacy mode): still
// reload at most once per document lifetime.
let retriedInMemory = false;

/** Install the recovery listener (call once from main.tsx before render). */
export function installStaleChunkRecovery(win: Window = window): void {
  win.addEventListener("vite:preloadError", (event) => {
    let alreadyRetriedHere: boolean;
    try {
      alreadyRetriedHere = win.sessionStorage.getItem(RELOADED_KEY) === win.location.href;
      if (!alreadyRetriedHere) win.sessionStorage.setItem(RELOADED_KEY, win.location.href);
    } catch {
      alreadyRetriedHere = retriedInMemory;
      retriedInMemory = true;
    }
    if (alreadyRetriedHere) return; // real failure — let the boundary show it
    event.preventDefault(); // suppress the throw; we are recovering
    win.location.reload();
  });
}
