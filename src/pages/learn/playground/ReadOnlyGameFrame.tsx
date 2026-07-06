import { useMemo } from 'react';

import type { VfsFile } from '../code/codeApi';
import { buildGameSrcDoc, type GameEngine } from './buildGamePreview';

interface ReadOnlyGameFrameProps {
  /** The frozen, read-only VFS snapshot to play (class-wall or public play). */
  files: VfsFile[];
  /** Which engine the frozen game runs on — Phaser (2D) vs three.js (3D). MUST
   *  match how the game was authored, or the wrong engine global loads and the
   *  canvas renders nothing (learn-game-studio-3d-prd.md D-3D-01). Defaults to
   *  `phaser` for back-compat with 2D games / pre-fix snapshots. */
  engine?: GameEngine;
  /** Stable label for the iframe (a11y); the visitor never sees kid PII. */
  title?: string;
  /** testid for the iframe so the wall (`wall-game-iframe`) and the public play
   *  page (`play-iframe`) can target the SAME bare-canvas component. */
  testId?: string;
}

/**
 * The bare game canvas — and NOTHING else (D-GAME8 / D-GAME10d). Renders a
 * read-only VFS snapshot in the SAME opaque-origin sandbox as the studio runner
 * (`allow-scripts` only, NO `allow-same-origin`), but with none of the Game
 * Runner chrome: no toolbar (pause/mute/screen-size/restart/debug), no status
 * bar, no console panel, no editor, no chat. This is the component the interactive
 * class wall (J7) and the public `/play/:shareId` host (J8) both render — so the
 * "game-only" guarantee lives in ONE place.
 *
 * Security: identical iframe sandbox flags to `GameFrame`; the snapshot was frozen
 * + PII/safety-scanned at publish, so the public page exposes no kid identity and
 * no contact channel (§11h). No control channel is wired (read-only play), but the
 * srcdoc's own stat/console postMessages still flow out unchanged — which is what
 * the game-smoke oracle asserts against.
 */
export function ReadOnlyGameFrame({ files, engine = 'phaser', title = 'Game', testId }: ReadOnlyGameFrameProps) {
  const srcDoc = useMemo(() => buildGameSrcDoc(files, { engine }), [files, engine]);

  return (
    <iframe
      data-testid={testId}
      title={title}
      // Deliberately the SAME strict flags as the studio runner: NO
      // allow-same-origin / allow-top-navigation / allow-forms. Never weaken this.
      sandbox="allow-scripts allow-pointer-lock allow-orientation-lock"
      srcDoc={srcDoc}
      className="h-full w-full border-0"
    />
  );
}
