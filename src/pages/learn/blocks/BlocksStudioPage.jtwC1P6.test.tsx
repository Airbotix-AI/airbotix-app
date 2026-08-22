// @vitest-environment jsdom
// Journey to the West C1-P6 — the order-bug mission: the shipped chain runs
// wrong, and success needs the bug run FIRST and then a moved-blocks repair.
// The two slowest tests in the studio suite, so they get their own file.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadBlocksProject, saveBlocksProject } from './blocksApi';
import { blankProject } from './blocksModel';
import { useBlocksStore } from './blocksStore';
import { BlocksStudioPage } from './BlocksStudioPage';

vi.mock('./blocksApi', () => ({
  createBlocksProject: vi.fn(async () => ({ id: 'next-project' })),
  loadBlocksProject: vi.fn(async () => ({
    project: blankProject('Zone test'),
    version: 1,
    history: { past: [], future: [] },
    otherFiles: [],
  })),
  saveBlocksProject: vi.fn(async () => ({ status: 'saved', version: 2 })),
}));
vi.mock('../playground/projectPersistence', () => ({
  saveThumbnail: vi.fn(async () => undefined),
}));
// The season chain (Task 25): a finished Tiny Star scene records itself against
// the kid's server-side progression before the next scene may be offered.
vi.mock('./story-parts/storyPartsApi', () => ({
  completeStoryPart: vi.fn(async () => ({ part_id: 'part', completed_at: 'now' })),
  fetchStoryLineProgress: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // the store is a shared singleton — reset the read-only flag between tests
  useBlocksStore.getState().setReadOnly(false);
});

async function renderStudio(readOnly = false, embedded = false) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <BlocksStudioPage projectId="p1" readOnly={readOnly} embedded={embedded} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return screen.findByTestId('blocks-studio');
}

describe('BlocksStudioPage JtW C1-P6 order-bug mission', () => {
  it('makes JtW C1-P6 run the order bug before a moved-blocks repair can succeed', { timeout: 20_000 }, async () => {
    const orderDebug = blankProject('西游记 · 修好乱序的亮相');
    orderDebug.lessonId = 'jtw-s1-c1-p6';
    orderDebug.pages[0] = {
      id: 'jtw-c1-p6-page',
      background: 'jtw-s1-c1-flower-fruit-stone',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
          start: { gx: 8, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'stone-monkey-arrival-debug',
              blocks: [
                { op: 'when_flag' },
                { op: 'hide' },
                { op: 'play_sound', n: 2 },
                { op: 'say', text: 'Hello, I just came here.' },
                { op: 'hop', n: 1 },
                { op: 'show' },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: orderDebug,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    // Run the SHIPPED bug first — the required wrong-run observation.
    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-build-task', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep building ▶' }));

    // Repair by MOVING only the target blocks: Show before Say, Hop before Say.
    act(() => {
      useBlocksStore.getState().moveBlock('stone-monkey-arrival-debug', 5, 3);
      useBlocksStore.getState().moveBlock('stone-monkey-arrival-debug', 5, 4);
    });
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'hide' },
      { op: 'play_sound', n: 2 },
      { op: 'show' },
      { op: 'hop', n: 1 },
      { op: 'say', text: 'Hello, I just came here.' },
      { op: 'end' },
    ]);
    await waitFor(() => expect(saveBlocksProject).toHaveBeenCalled());

    // The rerun of the repaired chain now completes the debug mission.
    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-mission-success', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('story-celebration')).toBeInTheDocument();
  });

  it('JtW C1-P6 refuses success when the repair lands without a prior bug run', { timeout: 20_000 }, async () => {
    const orderDebug = blankProject('西游记 · 修好乱序的亮相');
    orderDebug.lessonId = 'jtw-s1-c1-p6';
    orderDebug.pages[0] = {
      id: 'jtw-c1-p6-page',
      background: 'jtw-s1-c1-flower-fruit-stone',
      characters: [
        {
          id: 'stone-monkey',
          name: 'Stone Monkey',
          emoji: '🐵',
          asset: '/story-blocks/journey-to-the-west/characters/stone-monkey/neutral-v01.png',
          start: { gx: 8, gy: 9, size: 3, rot: 0 },
          scripts: [
            {
              id: 'stone-monkey-arrival-debug',
              blocks: [
                { op: 'when_flag' },
                { op: 'hide' },
                { op: 'play_sound', n: 2 },
                { op: 'say', text: 'Hello, I just came here.' },
                { op: 'hop', n: 1 },
                { op: 'show' },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: orderDebug,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    // Fix immediately — skipping the bug run.
    act(() => {
      useBlocksStore.getState().moveBlock('stone-monkey-arrival-debug', 5, 3);
      useBlocksStore.getState().moveBlock('stone-monkey-arrival-debug', 5, 4);
    });
    await waitFor(() => expect(saveBlocksProject).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('go-button'));
    // The run finishes but the mission does NOT complete: the bug run is missing.
    expect(
      await screen.findByTestId('story-build-task', {}, { timeout: 8000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    expect(screen.queryByTestId('story-celebration')).not.toBeInTheDocument();
  });
});
