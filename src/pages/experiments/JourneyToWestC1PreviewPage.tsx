import { useEffect, useMemo, useState } from 'react';

import { BlocksStudioPage } from '../learn/blocks/BlocksStudioPage';
import { parseProject, serializeProject } from '../learn/blocks/blocksModel';
import {
  setDemoBlocksAdapter,
  type BlocksSaveResult,
  type LoadedBlocksProject,
} from '../learn/blocks/blocksApi';
import { useBlocksTheme } from '../learn/blocks/blocksTheme';
import { setDemoShareAdapter, type DemoShareAdapter } from '../learn/playground/sharingApi';
import { DemoModeProvider, type DemoMode } from '../try/demoMode';
import {
  JOURNEY_TO_WEST_C1_PREVIEW_ID,
  JOURNEY_TO_WEST_C1_PROJECT,
} from './journeyToWestC1Project';

const disabledShareAdapter: DemoShareAdapter = {
  get: () => ({ status: 'none' }),
  request: () => ({ status: 'none' }),
  approve: () => ({ status: 'none' }),
  revoke: () => ({ status: 'none' }),
};

export function JourneyToWestC1PreviewPage() {
  const [armed, setArmed] = useState(false);
  const demoMode = useMemo<DemoMode>(
    () => ({
      surface: 'blocks',
      exitHref: '/',
      shareProjectId: JOURNEY_TO_WEST_C1_PREVIEW_ID,
    }),
    [],
  );

  useEffect(() => {
    let version = 1;
    setDemoBlocksAdapter({
      load: async (): Promise<LoadedBlocksProject> => ({
        project: parseProject(serializeProject(JOURNEY_TO_WEST_C1_PROJECT)),
        version,
        history: { past: [], future: [] },
        otherFiles: [],
      }),
      save: async (): Promise<BlocksSaveResult> => ({
        status: 'saved',
        version: (version += 1),
      }),
    });
    setDemoShareAdapter(disabledShareAdapter);
    useBlocksTheme.setState({ theme: 'light' });
    setArmed(true);

    return () => {
      setDemoBlocksAdapter(null);
      setDemoShareAdapter(null);
    };
  }, []);

  return (
    <DemoModeProvider value={demoMode}>
      <main className="flex h-screen w-full flex-col overflow-hidden bg-[#173d38]">
        <header
          className="flex min-h-14 items-center justify-between gap-4 bg-[#173d38] px-5 py-2 text-white"
          data-testid="jtw-c1-preview-header"
        >
          <div>
            <strong className="text-base">
              Journey to the West · Chapter 1: The Stone Monkey Is Born
            </strong>
            <p className="text-xs text-white/75">
              Real BlocksRunner prototype · Chime → Show → Hop → Say hello
            </p>
          </div>
          <span className="rounded-full bg-[#f4d06f] px-3 py-1 text-xs font-bold text-[#173d38]">
            Local prototype · Not published
          </span>
        </header>
        <div className="bsx-demo-host relative min-h-0 flex-1">
          {armed && <BlocksStudioPage projectId={JOURNEY_TO_WEST_C1_PREVIEW_ID} embedded />}
        </div>
      </main>
    </DemoModeProvider>
  );
}
