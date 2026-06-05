// Game studio top-level page. Single source of truth for the playground's
// virtual FS and run state (virtual-desktop-design.md §2). Owns the VFS seeded
// from the canonical starter game and a monotonic `runKey` the runner watches
// to (re-)mount the preview. Children lift edits via `onApplyFiles` and request
// a re-run via `onRun`; this page holds no backend/auth wiring — purely local
// state this iteration.

import { useCallback, useState } from 'react';

import type { VfsFile } from '../code/codeApi';
import { Desktop } from './desktop/Desktop';
import { STARTER_GAME } from './starterGame';

export function PlaygroundPage() {
  const [files, setFiles] = useState<VfsFile[]>(STARTER_GAME);
  const [runKey, setRunKey] = useState(0);

  // Bumping `runKey` is how every child asks for a fresh run; the runner keys
  // its iframe off it so a re-run is a clean remount, not a mutation.
  const run = useCallback(() => setRunKey((k) => k + 1), []);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Desktop files={files} runKey={runKey} onApplyFiles={setFiles} onRun={run} />
    </div>
  );
}
