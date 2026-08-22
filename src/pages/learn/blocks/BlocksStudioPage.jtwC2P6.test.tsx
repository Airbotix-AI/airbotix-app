// @vitest-environment jsdom
// Journey to the West C2-P6 in the REAL Blocks Studio (scene-specs
// JTW-S1-C2-P6): the starter ships the return-order bug, and the mission may
// only complete after a run that reproduced it AND a rerun of the repaired
// order. Kept in its own file so BlocksStudioPage.test.tsx does not grow.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadBlocksProject } from './blocksApi';
import { blankProject } from './blocksModel';
import { useBlocksStore } from './blocksStore';
import { BlocksStudioPage } from './BlocksStudioPage';
import { C2_P6_BUG_MOVES, C2_P6_TARGET_MOVES } from './story-parts/journeyWestC2Part6Program';

vi.mock('./blocksApi', () => ({
  createBlocksProject: vi.fn(async () => ({ id: 'next-project' })),
  loadBlocksProject: vi.fn(async () => ({
    project: blankProject('C2-P6 test'),
    version: 1,
    history: { past: [], future: [] },
    otherFiles: [],
  })),
  saveBlocksProject: vi.fn(async () => ({ status: 'saved', version: 2 })),
}));
vi.mock('../playground/projectPersistence', () => ({
  saveThumbnail: vi.fn(async () => undefined),
}));
vi.mock('./story-parts/storyPartsApi', () => ({
  completeStoryPart: vi.fn(async () => ({ part_id: 'part', completed_at: 'now' })),
  fetchStoryLineProgress: vi.fn(),
}));

const SCRIPT_ID = 'stone-monkey-return-bug';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useBlocksStore.getState().setReadOnly(false);
});

/** The starter document the backend seeds for `blocks_jtw_c2_p6`. */
function returnBugProject() {
  const project = blankProject("Journey to the West · The first deviation when going back");
  project.lessonId = 'jtw-s1-c2-p6';
  project.pages[0] = {
    id: 'jtw-c2-p6-page',
    background: 'jtw-s1-c2-water-curtain-actor-free',
    characters: [
      {
        id: 'stone-monkey',
        name: 'Stone Monkey',
        emoji: '🐵',
        asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
        start: { gx: 6, gy: 7, size: 3, rot: 0 },
        scripts: [
          { id: SCRIPT_ID, blocks: [{ op: 'when_flag' }, ...C2_P6_BUG_MOVES, { op: 'end' }] },
        ],
      },
      {
        id: 'cave-entrance',
        name: 'Cave Entrance',
        emoji: '🕳️',
        asset: '/story-blocks/journey-to-the-west/characters/cave-entrance/revealed-v01.png',
        start: { gx: 7, gy: 7, size: 4, reach: 1, rot: 0, visible: true },
        scripts: [],
      },
    ],
  };
  return project;
}

async function renderStudioWithStarter() {
  vi.mocked(loadBlocksProject).mockResolvedValueOnce({
    project: returnBugProject(),
    version: 1,
    history: { past: [], future: [] },
    otherFiles: [],
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <BlocksStudioPage projectId="p1" readOnly={false} embedded />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await screen.findByTestId('blocks-studio');
  fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
}

/** The one legal repair: move the Down 1 (slot 3) in front of the second Left 2. */
function swapDownBeforeSecondLeft() {
  act(() => {
    useBlocksStore.getState().moveBlock(SCRIPT_ID, 3, 2);
  });
  expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
    { op: 'when_flag' },
    ...C2_P6_TARGET_MOVES,
    { op: 'end' },
  ]);
}

describe('BlocksStudioPage · JtW C2-P6 return-order debug', () => {
  it('runs the shipped bug first, then completes on the repaired rerun', { timeout: 20_000 }, async () => {
    await renderStudioWithStarter();

    // The shipped order runs, but a bug run never succeeds.
    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-build-task', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep building ▶' }));

    swapDownBeforeSecondLeft();

    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-mission-success', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
  });

  it('refuses success when the repair lands without a prior bug run', { timeout: 20_000 }, async () => {
    await renderStudioWithStarter();

    swapDownBeforeSecondLeft();

    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-build-task', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
  });
});
