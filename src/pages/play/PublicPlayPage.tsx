import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { ReadOnlyGameFrame } from '../learn/playground/ReadOnlyGameFrame';
import { ShareGoneError, readPublicSnapshot, type PublicSnapshot } from '../learn/playground/sharingApi';
import { ReadOnlyBlocksPlayer } from '../learn/blocks/ReadOnlyBlocksPlayer';
import { BLOCKS_PROJECT_FILE, parseProject } from '../learn/blocks/blocksModel';
import { PlayBrandBar } from './PlayBrandBar';

/**
 * PUBLIC play host — `/play/:shareId` (learn-game-studio-prd.md §17.8 J8 /
 * D-GAME10). A logged-out visitor (e.g. grandma) opens the unlisted capability
 * URL and plays a kid's game with NO login.
 *
 * Hard constraints (D-GAME10d/e, NON-NEGOTIABLE):
 *   - The play SURFACE is the bare game canvas / blocks player only — none of the
 *     Game Runner chrome (no toolbar: pause/mute/screen-size/restart/debug; no
 *     status bar; no console), no editor, no chat, no LLM, no share/remix controls.
 *   - The only chrome is the `PlayBrandBar` frame ABOVE the surface (D-GAME10e):
 *     AirBotix brand attribution + one first-party "Make your own" link to the
 *     marketing site. No kid PII, no auth, no LLM, no third-party ads (C14).
 *   - No auth token: the snapshot is fetched with a bare `fetch` (see
 *     `readPublicSnapshot`), so no `Authorization` header is ever sent.
 *   - The same opaque-origin sandbox as the studio (`ReadOnlyGameFrame`).
 *   - Revoked / expired → the public endpoint serves 410 → the gone state (no
 *     brand frame — a flat, PII-free dead end).
 *
 * NOT wrapped in any layout or `<ProtectedRoute>` — it must render with zero app
 * chrome for an anonymous visitor.
 */
export function PublicPlayPage() {
  const { shareId } = useParams<{ shareId: string }>();

  const snapshot = useQuery<PublicSnapshot>({
    queryKey: ['play', shareId],
    queryFn: () => readPublicSnapshot(shareId!),
    enabled: !!shareId,
    // A frozen snapshot never changes; don't retry a 410 (the gone state is final).
    retry: (_count, err) => !(err instanceof ShareGoneError),
    staleTime: Infinity,
  });

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

  // A blocks project carries project.blocks.json; render the read-only blocks
  // player. Otherwise it's a game → the sandboxed game frame (Phaser or three.js).
  const files = snapshot.data?.files;
  const blocksFile = files?.find((f) => f.path === BLOCKS_PROJECT_FILE);

  return (
    <div data-testid="play-root" className="flex h-screen w-screen flex-col bg-black">
      <PlayBrandBar />
      <div className="min-h-0 flex-1">
        {snapshot.isLoading ? (
          <div className="flex h-full w-full items-center justify-center text-white opacity-70">
            Loading…
          </div>
        ) : blocksFile ? (
          <ReadOnlyBlocksPlayer project={parseProject(blocksFile.content)} />
        ) : files && files.length > 0 ? (
          // The ONLY thing rendered on a successful game load: the bare game canvas,
          // built on the engine the game was published under (2D Phaser / 3D three).
          <ReadOnlyGameFrame files={files} engine={snapshot.data!.engine} testId="play-iframe" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white opacity-70">
            This couldn’t be loaded.
          </div>
        )}
      </div>
    </div>
  );
}
