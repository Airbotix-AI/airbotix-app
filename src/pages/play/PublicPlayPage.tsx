import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { ReadOnlyGameFrame } from '../learn/playground/ReadOnlyGameFrame';
import { ShareGoneError, readPublicSnapshot, reportPlay } from '../learn/playground/sharingApi';
import type { VfsFile } from '../learn/code/codeApi';

/**
 * PUBLIC play host — `/play/:shareId` (learn-game-studio-prd.md §17.8 J8 /
 * D-GAME10). A logged-out visitor (e.g. grandma) opens the unlisted capability
 * URL and plays a kid's game with NO login.
 *
 * Hard constraints (D-GAME10d, NON-NEGOTIABLE):
 *   - The page is the BARE game canvas only — none of the Game Runner chrome
 *     (no toolbar: pause/mute/screen-size/restart/debug; no status bar; no
 *     console), no editor, no chat, no LLM, no share/remix controls.
 *   - No auth token: the snapshot is fetched with a bare `fetch` (see
 *     `readPublicSnapshot`), so no `Authorization` header is ever sent.
 *   - No kid PII/identity on the page.
 *   - The same opaque-origin sandbox as the studio (`ReadOnlyGameFrame`).
 *   - Revoked / expired → the public endpoint serves 410 → the gone state.
 *
 * NOT wrapped in any layout or `<ProtectedRoute>` — it must render with zero app
 * chrome for an anonymous visitor.
 */
export function PublicPlayPage() {
  const { shareId } = useParams<{ shareId: string }>();

  const snapshot = useQuery<VfsFile[]>({
    queryKey: ['play', shareId],
    queryFn: () => readPublicSnapshot(shareId!),
    enabled: !!shareId,
    // A frozen snapshot never changes; don't retry a 410 (the gone state is final).
    retry: (_count, err) => !(err instanceof ShareGoneError),
    staleTime: Infinity,
  });

  // Count one "play" the first time the sandboxed game reports it's running
  // (fps > 0) — the open already counted when the snapshot loaded. Best-effort.
  const reported = useRef(false);
  useEffect(() => {
    if (!shareId) return;
    const onMsg = (e: MessageEvent) => {
      const m = e.data as { __airbotixStat?: boolean; fps?: number } | null;
      if (m?.__airbotixStat === true && (m.fps ?? 0) > 0 && !reported.current) {
        reported.current = true;
        void reportPlay(shareId);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [shareId]);

  // Revoked or expired → 410 Gone. A flat, friendly, PII-free page.
  if (snapshot.error instanceof ShareGoneError) {
    return (
      <div
        data-testid="play-revoked"
        className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-black px-6 text-center text-white"
      >
        <div className="text-[40px]">🌙</div>
        <h1 className="text-[20px] font-bold">This game link has ended</h1>
        <p className="max-w-xs text-[14px] opacity-70">
          The link was turned off or has expired. Ask whoever shared it for a fresh one.
        </p>
      </div>
    );
  }

  return (
    <div data-testid="play-root" className="h-screen w-screen bg-black">
      {snapshot.isLoading ? (
        <div className="flex h-full w-full items-center justify-center text-white opacity-70">
          Loading game…
        </div>
      ) : snapshot.data && snapshot.data.length > 0 ? (
        // The ONLY thing rendered on a successful load: the bare game canvas.
        <ReadOnlyGameFrame files={snapshot.data} testId="play-iframe" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white opacity-70">
          This game couldn’t be loaded.
        </div>
      )}
    </div>
  );
}
