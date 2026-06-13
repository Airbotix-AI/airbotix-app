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
import { useBlocksTheme } from '../learn/blocks/blocksTheme';
import { setDemoAssetGen } from '../learn/playground/assetGen';
import {
  DEMO_BLOCKS_SHARE_ID,
  DEMO_PLAYGROUND_SHARE_ID,
  setDemoShareAdapter,
  type DemoShareAdapter,
  type ShareLink,
} from '../learn/playground/sharingApi';
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

/** The fixed project id the playground demo uses for its share panel (D-DEMO-09). */
export const TRY_PLAYGROUND_PROJECT_ID = 'try-demo-playground';

// ── Share demo beat (D-DEMO-09) ───────────────────────────────────────────────

/**
 * A single-slot, in-memory share lifecycle for one demo surface (D-DEMO-09). The
 * REAL `ShareLinkPanel` / `BlocksSharePanel` render unchanged off these states;
 * the tour drives `request` (→ pending) then `approve` (the ONE simulated
 * grown-up beat → active, surfacing `shareId` so the link points at the bundled
 * `/play/:shareId` snapshot). Zero network, reset on (re)install.
 */
function makeDemoShareAdapter(shareId: string): DemoShareAdapter {
  let status: ShareLink['status'] = 'none';
  // A real `pending`/`active` link already carries its capability id; expose it
  // from `pending` on so the panel's "Cancel request" + the active URL work.
  const view = (): ShareLink => ({
    status,
    shareId: status === 'none' ? undefined : shareId,
    expires_at: null,
    show_handle: false,
    plays: 0,
  });
  return {
    get: () => view(),
    request: () => {
      status = 'pending';
      return view();
    },
    approve: () => {
      status = 'active';
      return view();
    },
    revoke: () => {
      status = 'none';
      return view();
    },
  };
}

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
  setDemoShareAdapter(makeDemoShareAdapter(DEMO_PLAYGROUND_SHARE_ID)); // §3 step 11
  useProjectStore.getState().setFiles([]);
  useHistoryStore.getState().reset();
}

export function uninstallPlaygroundDemo(): void {
  setDemoProjectFiles(null);
  setDemoMemoryPersistence(false);
  setDemoRunTurn(null);
  setDemoHelpCorpus(null);
  setDemoAssetGen(null);
  setDemoShareAdapter(null);
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
  setDemoShareAdapter(makeDemoShareAdapter(DEMO_BLOCKS_SHARE_ID)); // §4 share beat
  setDemoMemoryPersistence(true); // the studio's cover-thumbnail cache
  // The demo always opens LIGHT (the story art is daylight-first), regardless of
  // the visitor's system preference or any stored studio override. setState only
  // — never localStorage — so a real user's saved theme is untouched (D-DEMO-02).
  useBlocksTheme.setState({ theme: 'light' });
}

export function uninstallBlocksDemo(): void {
  setDemoBlocksAdapter(null);
  setDemoMemoryPersistence(false);
  setDemoShareAdapter(null);
}
