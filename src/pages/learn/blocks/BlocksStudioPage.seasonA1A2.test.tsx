// @vitest-environment jsdom
// Tiny Star Village chapters one and two — the Story Hook / Ship / Build /
// Debug missions for A1 and A2, plus the season chain that refuses a scene
// played out of order. Split out of BlocksStudioPage.test.tsx so each season
// runs in its own vitest worker instead of queueing behind the others.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import { createBlocksProject, loadBlocksProject, saveBlocksProject } from './blocksApi';
import { completeStoryPart } from './story-parts/storyPartsApi';
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

describe('BlocksStudioPage Tiny Star season A1–A2 missions', () => {
  it('lets A1-S choose a real greeting inside the persisted Say block', async () => {
    const personalProject = blankProject('Tiny Star Village · My Morning');
    personalProject.lessonId = 'tsv-s1-a1-s';
    personalProject.pages[0] = {
      id: 'tsv-a1-s-page',
      background: 'tsv-window-room-dim',
      characters: [
        {
          id: 'little-light',
          name: 'Lumilo',
          emoji: '⭐',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'little-light-flag',
              blocks: [
                { op: 'when_flag' },
                { op: 'hop', n: 1 },
                { op: 'say', text: 'Choose my greeting' },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: personalProject,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getByTestId('block-say'));
    expect(screen.getByTestId('story-greeting-picker').children).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: /Good morning, village!/ }));
    expect(screen.getByTestId('say-input')).toHaveValue('Good morning, village!');
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks[2]).toEqual({
      op: 'say',
      text: 'Good morning, village!',
    });
  });

  it('restores a server-verified completion and opens the exact next story scene', async () => {
    const completedProject = blankProject('Tiny Star Village · The Backwards Morning');
    completedProject.lessonId = 'tsv-s1-a1-d';
    completedProject.pages[0] = {
      id: 'tsv-a1-d-page',
      background: 'tsv-window-room-dim',
      characters: [
        {
          id: 'little-light',
          name: 'Lumilo',
          emoji: '⭐',
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'little-light-flag',
              blocks: [
                { op: 'when_flag' },
                { op: 'hop', n: 1 },
                { op: 'say', text: 'Morning!' },
                { op: 'end' },
              ],
            },
          ],
        },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: completedProject,
      version: 4,
      history: { past: [], future: [] },
      otherFiles: [],
      storyProgress: {
        schemaVersion: 1,
        completed: { 'tsv-s1-a1-d': { completedAt: '2026-07-14T00:00:00.000Z' } },
      },
    });

    await renderStudio();

    expect(await screen.findByTestId('story-mission-success')).toBeInTheDocument();
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-scene',
      'tsv-window-room-dim',
    );
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-state',
      'resolved',
    );
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-window-room-resolved-bright',
    );
    expect(screen.getByTestId('story-completion-evidence')).toHaveTextContent('Work saved');
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-mission-success', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('story-celebration')).toBeInTheDocument();
    expect(
      screen.getByTestId('sprite-little-light').querySelector('[data-performance="success"]'),
    ).toHaveAttribute(
      'data-performance',
      'success',
    );
    expect(screen.getByTestId('sprite-little-light').querySelector('img')).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/characters/little-light/success-joyful-v01.png',
    );
    fireEvent.click(screen.getByTestId('story-next-mission'));
    await waitFor(() =>
      expect(createBlocksProject).toHaveBeenCalledWith({
        template: 'blocks_tsv_a1_s',
        title: 'Tiny Star Village · My morning greeting',
      }),
    );
  });

  const directionHookProject = () => {
    const directionProject = blankProject('Tiny Star Village · Which Way?');
    directionProject.lessonId = 'tsv-s1-a2-h';
    directionProject.pages[0] = {
      id: 'tsv-a2-h-page',
      background: 'tsv-cloud-road-right',
      characters: [
        {
          id: 'tuan-tuan',
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'tuan-tuan-flag',
              blocks: [{ op: 'when_flag' }, { op: 'move_left', n: 3 }, { op: 'end' }],
            },
          ],
        },
      ],
    };
    return directionProject;
  };

  /** Play A2-H to completion: the unchanged wrong-way run, then "farther". */
  const playDirectionHook = async () => {
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getByTestId('go-button'));
    await screen.findByTestId('story-mission-question', {}, { timeout: 3000 });
    fireEvent.click(screen.getByTestId('story-choice-farther'));
    return screen.findByTestId('story-hook-complete');
  };

  it('completes A2-H only after the unchanged wrong-way run and a farther observation', async () => {
    const directionProject = directionHookProject();
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: directionProject,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    await renderStudio();
    expect(await screen.findByTestId('story-tuan-tuan')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '8');
    expect(screen.queryByTestId('sprite-plaza-target')).not.toBeInTheDocument();
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-target-gx', '11');

    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-mission-question', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '5');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-target-gx', '11');
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('story-choice-closer'));
    expect(screen.getByRole('status')).toHaveTextContent('gap');
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('story-choice-farther'));
    expect(await screen.findByTestId('story-hook-complete')).toHaveTextContent('finished farther');
    expect(screen.queryByTestId('story-celebration')).not.toBeInTheDocument();

    expect(directionProject.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'move_left', n: 3 },
      { op: 'end' },
    ]);
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a2-h': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
    // Task 25: the finished scene advances the season chain, and its evidence is
    // the saved project the studio just verified — never a page boolean.
    await waitFor(() =>
      expect(completeStoryPart).toHaveBeenCalledWith('tiny-star-village-s1', 'tsv-s1-a2-h', {
        schema_version: 1,
        selections: { saved_project: ['p1'] },
      }),
    );
    expect(await screen.findByTestId('story-next-mission')).toHaveTextContent('Choose an arrow');
  });

  it('does not open the next scene when the season chain refuses a scene played early', async () => {
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: directionHookProject(),
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });
    vi.mocked(completeStoryPart).mockRejectedValueOnce(
      new ApiError(403, 'STORY_PART_LOCKED', 'Finish the previous story part first.'),
    );

    await renderStudio();
    expect(await playDirectionHook()).toBeInTheDocument();

    // The child's own work is still saved…
    await waitFor(() => expect(completeStoryPart).toHaveBeenCalled());
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a2-h': expect.anything() }),
        }),
      }),
    );
    // …but the scene after it stays shut, with the reason in the child's words.
    expect(await screen.findByRole('alert')).toHaveTextContent('opens scenes in order');
    expect(screen.queryByTestId('story-next-mission')).not.toBeInTheDocument();
    expect(screen.getByTestId('story-back-to-collection')).toBeInTheDocument();
  });

  it('keeps the A2-S home picker compact and shows the selected star route', async () => {
    const personalPath = blankProject('Tiny Star Village · My Two-Step Path');
    personalPath.lessonId = 'tsv-s1-a2-s';
    personalPath.pages[0] = {
      id: 'tsv-a2-s-page',
      background: 'tsv-cloud-road-right',
      characters: [
        {
          id: 'tuan-tuan',
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [{ id: 'tuan-tuan-flag', blocks: [{ op: 'when_flag' }, { op: 'end' }] }],
        },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: personalPath,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    const studio = await renderStudio();
    expect(studio).toHaveClass('has-home-picker');
    expect(studio).toHaveAttribute('data-story', 'true');
    const picker = screen.getByTestId('a2-s-endpoint-picker');
    expect(picker).toHaveTextContent('Choose my home star');
    const rightHome = screen.getByTestId('a2-s-endpoint-right');
    expect(rightHome).toHaveAttribute('aria-pressed', 'true');
    expect(rightHome).toHaveClass('selected');
    fireEvent.click(screen.getByTestId('a2-s-endpoint-left'));
    expect(useBlocksStore.getState().project.pages[0].background).toBe(
      'tsv-cloud-road-left-target',
    );
    fireEvent.click(rightHome);
    expect(useBlocksStore.getState().project.pages[0].background).toBe('tsv-cloud-road-right');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-target-gx', '10');

    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getByTestId('cat-motion'));
    const rightPalette = screen
      .getByTestId('palette')
      .querySelector('[data-testid="block-move_right"]');
    expect(rightPalette).not.toBeNull();
    fireEvent.pointerDown(rightPalette!);
    fireEvent.pointerUp(rightPalette!);
    fireEvent.pointerDown(rightPalette!);
    fireEvent.pointerUp(rightPalette!);

    await waitFor(() =>
      expect(screen.getByTestId('save-status')).toHaveAttribute('data-status', 'saved'),
    );
    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-mission-success', {}, { timeout: 3000 }),
    ).toHaveTextContent('saved your personal story');
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a2-s': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  });

  it('makes A2-B arrows fixed at 3 and completes at the locked gx11 target', async () => {
    const directionBuild = blankProject('Tiny Star Village · Choose an Arrow');
    directionBuild.lessonId = 'tsv-s1-a2-b';
    directionBuild.pages[0] = {
      id: 'tsv-a2-b-page',
      background: 'tsv-cloud-road-right',
      characters: [
        {
          id: 'tuan-tuan',
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'tuan-tuan-flag',
              blocks: [{ op: 'when_flag' }, { op: 'end' }],
            },
          ],
        },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: directionBuild,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getByTestId('cat-motion'));

    const leftPalette = screen
      .getByTestId('palette')
      .querySelector('[data-testid="block-move_left"]');
    expect(leftPalette).not.toBeNull();
    fireEvent.pointerDown(leftPalette!);
    fireEvent.pointerUp(leftPalette!);
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'move_left', n: 3 },
      { op: 'end' },
    ]);
    fireEvent.click(screen.getAllByTestId('block-move_left').at(-1)!);
    expect(screen.queryByTestId('block-editor')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-build-task', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '5');
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep building ▶' }));

    act(() => useBlocksStore.getState().removeBlock('tuan-tuan-flag', 1));
    const rightPalette = screen
      .getByTestId('palette')
      .querySelector('[data-testid="block-move_right"]');
    expect(rightPalette).not.toBeNull();
    fireEvent.pointerDown(rightPalette!);
    fireEvent.pointerUp(rightPalette!);
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'move_right', n: 3 },
      { op: 'end' },
    ]);
    await waitFor(() => expect(saveBlocksProject).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByTestId('story-coach-cue')).toHaveTextContent('Press Go to test'),
    );

    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-mission-success', {}, { timeout: 3000 }),
    ).toHaveTextContent('Tuan Tuan travelled from grid 8');
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '11');
    expect(screen.getByTestId('story-celebration')).toBeInTheDocument();
    expect(
      screen.getByTestId('sprite-tuan-tuan').querySelector('[data-performance="success"]'),
    ).toHaveAttribute(
      'data-performance',
      'success',
    );
    expect(screen.getByTestId('sprite-tuan-tuan').querySelector('img')).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/characters/cloud-bear/success-joyful-v01.png',
    );
  });

  it('makes A2-D run Left 3 before allowing a one-block Right repair', async () => {
    const directionDebug = blankProject('Tiny Star Village · Tuan Tuan Walked the Wrong Way');
    directionDebug.lessonId = 'tsv-s1-a2-d';
    directionDebug.pages[0] = {
      id: 'tsv-a2-d-page',
      background: 'tsv-cloud-road-right',
      characters: [
        {
          id: 'tuan-tuan',
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'tuan-tuan-flag',
              blocks: [{ op: 'when_flag' }, { op: 'move_left', n: 3 }, { op: 'end' }],
            },
          ],
        },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: directionDebug,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getAllByTestId('block-move_left').at(-1)!);
    expect(screen.queryByTestId('direction-repair-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('story-mission')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-build-task', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Keep building ▶' }));

    fireEvent.click(screen.getAllByTestId('block-move_left').at(-1)!);
    expect(screen.getByTestId('direction-repair-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('direction-repair-move_right'));
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' },
      { op: 'move_right', n: 3 },
      { op: 'end' },
    ]);
    await waitFor(() => expect(saveBlocksProject).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-mission-success', {}, { timeout: 3000 }),
    ).toHaveTextContent('changed only its arrow');
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '11');
    expect(screen.getByTestId('story-celebration')).toBeInTheDocument();
  });
});
