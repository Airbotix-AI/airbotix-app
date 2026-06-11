// Demo adapters (try-demo-mode-prd D-DEMO-02/03): the studios' boundary modules
// must serve everything in-memory while a demo is armed — zero network, zero
// IndexedDB — and a re-install (re-entry) must start pristine.

import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadBlocksProject, saveBlocksProject } from '../learn/blocks/blocksApi';
import { resolveProjectFiles } from '../learn/playground/panes/playgroundApi';
import {
  loadProject,
  saveProject,
  type PersistedProject,
} from '../learn/playground/projectPersistence';
import {
  TRY_BLOCKS_PROJECT_ID,
  installBlocksDemo,
  installPlaygroundDemo,
  uninstallBlocksDemo,
  uninstallPlaygroundDemo,
} from './demoAdapters';
import { DEMO_GAME_FILE, demoStarterFiles } from './demoStarter.playground';
import { createScriptedDemoAgent } from './scriptedAgent';

const agent = () => createScriptedDemoAgent({ turnDelayMs: 0 });

const SNAPSHOT: PersistedProject = {
  files: [{ path: 'a.js', content: 'x', kind: 'text', size: 1 }],
  folders: [],
  checkpoints: [],
  savedAt: 1,
  version: 0,
};

afterEach(() => {
  uninstallPlaygroundDemo();
  uninstallBlocksDemo();
  vi.restoreAllMocks();
});

describe('playground demo adapters', () => {
  it('resolveProjectFiles serves the bundled starter with zero network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    installPlaygroundDemo(agent());
    const files = await resolveProjectFiles({ prompt: 'anything' });
    expect(files.map((f) => f.path)).toContain(DEMO_GAME_FILE);
    expect(files).toEqual(demoStarterFiles());
    expect(fetchSpy).not.toHaveBeenCalled();
    // Uninstalled → the seam is off again (the project-less Pong scaffold,
    // which has a Boot scene the demo starter deliberately lacks).
    uninstallPlaygroundDemo();
    const scaffold = await resolveProjectFiles({ prompt: 'anything' });
    expect(scaffold).not.toEqual(files);
    expect(scaffold.map((f) => f.path)).toContain('src/scenes/Boot.js');
  });

  it('persistence is in-memory only and pristine on re-install (D-DEMO-02)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    installPlaygroundDemo(agent());
    // No projectId → the cache-only path; in demo, the cache is the memory map.
    await expect(saveProject('try-key', SNAPSHOT)).resolves.toEqual({ status: 'saved', version: 0 });
    await expect(loadProject('try-key')).resolves.toMatchObject({ savedAt: 1 });
    // Re-entry = a fresh map: nothing survives an uninstall/install cycle.
    uninstallPlaygroundDemo();
    installPlaygroundDemo(agent());
    await expect(loadProject('try-key')).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('install resets the live project/history stores (reset-on-entry)', async () => {
    const { useProjectStore } = await import('../learn/playground/projectStore');
    useProjectStore.getState().setFiles(SNAPSHOT.files);
    installPlaygroundDemo(agent());
    expect(useProjectStore.getState().files).toEqual([]);
  });

  it('routes the existing stub seam to the scripted agent while armed (D-DEMO-04)', async () => {
    const { runTurnStub } = await import('../learn/playground/panes/gameAgentStub');
    const { PLAYGROUND_DEMO_SCRIPT } = await import('./demoScript.playground');
    installPlaygroundDemo(agent());
    const files = demoStarterFiles();
    const scripted = await runTurnStub(PLAYGROUND_DEMO_SCRIPT.steps[0].prompt, files);
    expect(scripted.summary).toBe(PLAYGROUND_DEMO_SCRIPT.steps[0].reply);
    // Uninstalled → the plain offline stub answers again.
    uninstallPlaygroundDemo();
    const plain = await runTurnStub(PLAYGROUND_DEMO_SCRIPT.steps[0].prompt, files);
    expect(plain.summary).not.toBe(PLAYGROUND_DEMO_SCRIPT.steps[0].reply);
  });
});

describe('blocks demo adapter', () => {
  it('load serves the parsed story and save is an in-memory no-op', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    installBlocksDemo();
    const loaded = await loadBlocksProject(TRY_BLOCKS_PROJECT_ID);
    expect(loaded.project.name).toBe("Cat's Day Out");
    expect(loaded.project.pages).toHaveLength(3);
    expect(loaded.version).toBe(1);
    expect(loaded.otherFiles).toEqual([]);
    const saved = await saveBlocksProject({
      projectId: TRY_BLOCKS_PROJECT_ID,
      project: loaded.project,
      version: loaded.version,
      otherFiles: [],
    });
    expect(saved).toEqual({ status: 'saved', version: 2 });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('re-install serves a pristine story again (reset-on-entry)', async () => {
    installBlocksDemo();
    const first = await loadBlocksProject(TRY_BLOCKS_PROJECT_ID);
    await saveBlocksProject({
      projectId: TRY_BLOCKS_PROJECT_ID,
      project: first.project,
      version: first.version,
      otherFiles: [],
    });
    uninstallBlocksDemo();
    installBlocksDemo();
    const again = await loadBlocksProject(TRY_BLOCKS_PROJECT_ID);
    expect(again.version).toBe(1);
    expect(again.project).toEqual(first.project);
  });
});
