// In-memory demo adapters for the `/try/*` routes (try-demo-mode-prd §2
// D-DEMO-02/03). The studios keep calling their EXISTING boundary modules
// (`playgroundApi`, `projectPersistence`, `gameAgentStub`, `blocksApi`); this
// module installs/uninstalls the demo overrides behind those seams so a demo
// session is: zero `/projects*` / `/llm/*` network, zero IndexedDB — in-memory
// only, pristine again on every entry (install resets the memory) and on reload.

import { parseProject, serializeProject } from '../learn/blocks/blocksModel';
import {
  setDemoBlocksAdapter,
  type BlocksSaveResult,
  type LoadedBlocksProject,
} from '../learn/blocks/blocksApi';
import { setDemoAssetGen } from '../learn/playground/assetGen';
import { setDemoRunTurn, type RunTurn } from '../learn/playground/panes/gameAgentStub';
import { setDemoHelpCorpus } from '../learn/playground/panes/help/helpApi';
import { setDemoProjectFiles } from '../learn/playground/panes/playgroundApi';
import { setDemoMemoryPersistence } from '../learn/playground/projectPersistence';
import { useHistoryStore } from '../learn/playground/historyStore';
import { useProjectStore } from '../learn/playground/projectStore';
import { demoAssetGen } from './demoAssets.playground';
import { DEMO_HELP_CORPUS } from './demoHelp.playground';
import { demoStarterFiles } from './demoStarter.playground';
import { CATS_DAY_OUT } from './demoStory.blocks';

/** The fixed project id the blocks demo mounts the real studio with. */
export const TRY_BLOCKS_PROJECT_ID = 'try-demo-blocks';

// ── T1: Game Playground demo ──────────────────────────────────────────────────

/**
 * Arm the playground demo: bundled starter VFS, in-memory persistence (no
 * IndexedDB), the scripted agent behind the stub seam, the bundled Game Guide
 * corpus behind the help seam, and a clean store slate (D-DEMO-02
 * reset-on-entry, including SPA re-entry without a reload).
 */
export function installPlaygroundDemo(agent: RunTurn): void {
  setDemoProjectFiles(demoStarterFiles);
  setDemoMemoryPersistence(true); // also covers thumbnails/UI/chat caches
  setDemoRunTurn(agent);
  setDemoHelpCorpus(DEMO_HELP_CORPUS);
  setDemoAssetGen(demoAssetGen); // crafted offline art (§3 step 7)
  useProjectStore.getState().setFiles([]);
  useHistoryStore.getState().reset();
}

export function uninstallPlaygroundDemo(): void {
  setDemoProjectFiles(null);
  setDemoMemoryPersistence(false);
  setDemoRunTurn(null);
  setDemoHelpCorpus(null);
  setDemoAssetGen(null);
}

// ── T2: Blocks Studio demo ────────────────────────────────────────────────────

/**
 * Arm the blocks demo: `loadBlocksProject` serves the bundled story (run through
 * the REAL parser, exactly like a backend doc) and `saveBlocksProject` becomes an
 * in-memory no-op with honest version bumps. Each install starts fresh.
 */
export function installBlocksDemo(): void {
  let version = 1;
  setDemoBlocksAdapter({
    load: async (): Promise<LoadedBlocksProject> => ({
      project: parseProject(serializeProject(CATS_DAY_OUT)),
      version,
      history: { past: [], future: [] },
      otherFiles: [],
    }),
    save: async (): Promise<BlocksSaveResult> => ({ status: 'saved', version: (version += 1) }),
  });
  setDemoMemoryPersistence(true); // the studio's cover-thumbnail cache
}

export function uninstallBlocksDemo(): void {
  setDemoBlocksAdapter(null);
  setDemoMemoryPersistence(false);
}
