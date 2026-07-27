// @vitest-environment jsdom
// Zone label chips (learn-blocks-studio-prd.md clarity pass): every studio area
// wears an emoji-first name tag for pre-readers — 🎬 Stage, 🐱 Characters,
// 📖 Pages, 🧩 Blocks, ✨ What they do. Chips are decoration only (aria-hidden;
// the zones carry matching aria-labels) and disappear in present mode.

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

describe('BlocksStudioPage zone labels', () => {
  it('lets a child choose the friend used by a Junior If condition', async () => {
    const project = blankProject('Junior If');
    const cat = project.pages[0].characters[0];
    cat.scripts = [{
      id: 'cat-flag',
      blocks: [{ op: 'when_flag' }, { op: 'if_touching', body: [{ op: 'hop', n: 1 }] }],
    }];
    project.pages[0].characters.push({
      id: 'friend-2',
      name: 'Star',
      emoji: '⭐',
      start: { gx: 8, gy: 10, size: 1, rot: 0 },
      scripts: [],
    });
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    await renderStudio();
    expect(screen.getByTestId('if-container')).toBeInTheDocument();
    expect(screen.getByTestId('if-body')).toContainElement(screen.getByTestId('block-hop'));
    expect(screen.getByTestId('if-body')).toHaveTextContent('Then do');
    expect(screen.getByTestId('if-add-inside')).toHaveTextContent('Add block');
    fireEvent.click(screen.getByTestId('if-add-inside'));
    expect(screen.getByTestId('if-add-inside')).toHaveTextContent('Pick a block on the left');
    expect(screen.getByTestId('if-add-inside')).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByTestId('block-if_touching'));
    expect(screen.getByTestId('if-touching-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('if-touching-choice-friend-2'));
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks[1]).toEqual({
      op: 'if_touching',
      text: 'friend-2',
      body: [{ op: 'hop', n: 1 }],
    });
  });

  it('automatically opens the first-party story mission for a curriculum project', async () => {
    const curriculumProject = blankProject('Tiny Star Village');
    curriculumProject.lessonId = 'tsv-s1-a1-h';
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: curriculumProject,
      version: 1,
      history: { past: [], future: [] },
      otherFiles: [],
    });

    await renderStudio();
    expect(await screen.findByTestId('story-mission')).toHaveTextContent(
      'Meet Lumi, your morning-light friend',
    );
    expect(screen.getByTestId('story-lumilo').querySelector('svg')).toHaveAttribute(
      'data-performance',
      'speaking',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start the mission ▶' }));
    expect(screen.queryByTestId('story-mission')).not.toBeInTheDocument();
    expect(screen.getByTestId('story-mission-launcher')).toBeInTheDocument();
    expect(screen.getByTestId('story-coach')).toHaveTextContent('Press Go');
  });

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

  it('every zone wears its emoji-first name tag', async () => {
    await renderStudio();
    const chips: Array<[string, string]> = [
      ['zone-stage', '🎬Stage'],
      ['zone-chars', '🐱Characters'],
      ['zone-pages', '📖Pages'],
      ['zone-cats', '🧰Kinds'],
      ['zone-palette', '🧩Blocks'],
      ['zone-script', '✨What they do'],
    ];
    for (const [testId, text] of chips) {
      const chip = screen.getByTestId(testId);
      expect(chip).toHaveTextContent(text);
      // decoration only — never a touch target, never announced twice
      expect(chip).toHaveAttribute('aria-hidden');
    }
  });

  it('zone aria-labels match the visible chip labels', async () => {
    await renderStudio();
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('aria-label', 'Stage');
    expect(screen.getByLabelText('Characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Pages')).toBeInTheDocument();
    expect(screen.getByLabelText('Kinds of blocks')).toBeInTheDocument();
    expect(screen.getByTestId('palette')).toHaveAttribute('aria-label', 'Blocks');
    expect(screen.getByTestId('script-area')).toHaveAttribute('aria-label', 'What they do');
  });

  it('present mode flips the root class that hides every chip', async () => {
    const root = await renderStudio();
    expect(root).not.toHaveClass('present');
    fireEvent.click(screen.getByTestId('more-menu-btn'));
    fireEvent.click(screen.getByTestId('present-toggle'));
    // blocks.css: `.bsx-app.present .bsx-zonetag { display: none; }`
    expect(root).toHaveClass('present');
  });

  it("the empty program area's copy matches the ✨ What they do label", async () => {
    await renderStudio();
    expect(screen.getByTestId('script-area')).toHaveTextContent(
      /Tap a 🚩 block to pick what .+ does ✨/,
    );
  });

  it('lets a child choose one of six picture sounds for the program', async () => {
    await renderStudio();
    act(() => useBlocksStore.getState().addBlock('play_sound'));

    const soundBlocks = screen.getAllByTestId('block-play_sound');
    fireEvent.click(soundBlocks[soundBlocks.length - 1]);
    expect(screen.getByTestId('sound-picker').children).toHaveLength(6);

    fireEvent.click(screen.getByTestId('sound-choice-6'));
    expect(screen.getAllByTestId('block-play_sound').at(-1)).toHaveTextContent('✨Sparkle');
  });

  it('lets a child choose any note from 1 Do through 7 Ti', async () => {
    await renderStudio();
    act(() => useBlocksStore.getState().addBlock('play_note'));

    const noteBlocks = screen.getAllByTestId('block-play_note');
    fireEvent.click(noteBlocks[noteBlocks.length - 1]);
    expect(screen.getByTestId('note-picker').children).toHaveLength(7);

    fireEvent.click(screen.getByTestId('note-choice-7'));
    expect(screen.getAllByTestId('block-play_note').at(-1)).toHaveTextContent('7Ti');
  });

  it('shows all six sounds directly in the sound palette', async () => {
    await renderStudio();
    fireEvent.click(screen.getByTitle('Sound blocks'));

    const palette = screen.getByTestId('palette');
    expect(screen.getByTestId('cat-sound')).toHaveTextContent('7+6');
    expect(palette).toHaveTextContent('7 Notes + 6 Sounds');
    expect(screen.getAllByTestId('block-play_note')).toHaveLength(7);
    expect(palette).toHaveTextContent('1Do');
    expect(palette).toHaveTextContent('7Ti');
    expect(palette).toHaveTextContent('🫧Bubble Pop');
    expect(palette).toHaveTextContent('🔔Chime');
    expect(palette).toHaveTextContent('🥁Drum');
    expect(palette).toHaveTextContent('💨Whoosh');
    expect(palette).toHaveTextContent('🦘Boing');
    expect(palette).toHaveTextContent('✨Sparkle');

    const sparkle = screen
      .getAllByTestId('block-play_sound')
      .find((block) => block.textContent?.includes('Sparkle'));
    expect(sparkle).toBeDefined();
    fireEvent.pointerDown(sparkle!);
    fireEvent.pointerUp(sparkle!);
    expect(
      useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks.at(-1),
    ).toEqual({
      op: 'play_sound',
      n: 6,
    });
  });
});

// Teacher live read-only viewer (teacher-live-project-view-prd D-LV-6): the kid's
// blocks EDITOR renders from the VFS with the SAME regions/layout the kid sees —
// every edit affordance is RENDERED-but-DISABLED (visible, inert, dimmed), not
// hidden, so there's no empty coding band / missing palette. No mutation /
// autosave can happen.
describe('BlocksStudioPage read-only (teacher viewer)', () => {
  it('renders the full kid layout but with every edit affordance disabled (not hidden)', async () => {
    await renderStudio(true);
    // The editor layout is present (the teacher sees what the kid built).
    expect(screen.getByTestId('blocks-stage')).toBeInTheDocument();
    expect(screen.getByTestId('script-area')).toBeInTheDocument();
    expect(screen.getByLabelText('Characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Pages')).toBeInTheDocument();
    // Running stays enabled (non-destructive viewing).
    expect(screen.getByTestId('go-button')).toBeInTheDocument();

    // Every edit affordance is now PRESENT but non-interactive (inert + dimmed) —
    // the read-only layout mirrors the kid's, with no empty bands.
    const realButtons: Array<[string, string]> = [
      ['palette', 'palette'],
      ['add-character', 'add character'],
      ['add-page', 'add page'],
      ['scene-btn', 'scene picker'],
      ['trash-bin', 'trash bin'],
      ['undo', 'undo'],
      ['redo', 'redo'],
    ];
    for (const [testId] of realButtons) {
      const el = screen.getByTestId(testId);
      expect(el).toBeInTheDocument();
      expect(el).toHaveClass('pointer-events-none');
      expect(el).toHaveClass('opacity-60');
    }
    // The category bar is present + disabled (drives the palette).
    expect(screen.getByLabelText('Kinds of blocks')).toHaveClass('pointer-events-none');
    expect(screen.getByTestId('cat-trigger')).toBeDisabled();
    // The <button> edit controls are also natively disabled / aria-disabled.
    for (const testId of ['undo', 'redo', 'add-character', 'add-page', 'scene-btn']) {
      expect(screen.getByTestId(testId)).toBeDisabled();
    }
    // Share is a kid-only action — present (layout parity) but disabled + dimmed,
    // and its kid-scoped getShareLink query never fires (no teacher 403).
    const shareBtn = screen.getByTestId('share-link-btn');
    expect(shareBtn).toBeDisabled();
    expect(shareBtn).toHaveClass('pointer-events-none');
    expect(shareBtn).toHaveClass('opacity-60');

    // The CONTENT being viewed (stage, script chain, page thumbs) stays
    // full-opacity — only the EDIT controls get dimmed.
    expect(screen.getByTestId('script-area')).not.toHaveClass('opacity-60');
    expect(screen.getByTestId('blocks-stage')).not.toHaveClass('opacity-60');

    // Selecting a character/page (read-only navigation) stays available.
    const page0 = screen.queryByTestId('page-thumb-0');
    if (page0) fireEvent.click(page0); // never throws / mutates

    // The Home/back button STAYS hidden (the teacher viewer's banner provides
    // Back; a second back would be wrong — the one exception to render-but-disable).
    expect(screen.queryByTitle('Save & back')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demo-home')).not.toBeInTheDocument();
  });

  it('kid mode (editable) renders the same controls interactive + Home present', async () => {
    await renderStudio(false);
    // Edit controls are present and NOT given the disabled treatment.
    for (const testId of [
      'palette',
      'add-character',
      'add-page',
      'scene-btn',
      'trash-bin',
      'undo',
      'redo',
    ]) {
      const el = screen.getByTestId(testId);
      expect(el).toBeInTheDocument();
      expect(el).not.toHaveClass('pointer-events-none');
      expect(el).not.toHaveClass('opacity-60');
    }
    // add-character is a real interactive button (undo/redo can be natively
    // disabled by empty history — they're interactive by virtue of not being
    // aria-disabled for read-only).
    expect(screen.getByTestId('add-character')).not.toBeDisabled();
    expect(screen.getByTestId('add-character')).not.toHaveAttribute('aria-disabled');
    expect(screen.getByTestId('cat-trigger')).not.toBeDisabled();
    // Share is interactive for the kid.
    expect(screen.getByTestId('share-link-btn')).not.toBeDisabled();
    // The kid's Home/back button is present.
    expect(screen.getByTitle('Save & back')).toBeInTheDocument();
  });

  it('the store gate makes every mutation a no-op and never autosaves', async () => {
    await renderStudio(true);
    const before = useBlocksStore.getState().dirty;

    // Attempt mutations directly through the store — all must be blocked.
    act(() => {
      useBlocksStore.getState().addCharacter('🐶', 'Dog');
      useBlocksStore.getState().addPage();
      useBlocksStore.getState().addBlock('move_right');
      useBlocksStore.getState().undo();
      useBlocksStore.getState().redo();
    });

    expect(useBlocksStore.getState().dirty).toBe(before); // no mutation landed
    // dirty never advanced → the debounced autosave can never have fired.
    expect(saveBlocksProject).not.toHaveBeenCalled();
  });
});

// Home-link seam (teacher-prep-projects Stage 2): `embedded` hides the 🏠 home
// link (which routes into `/learn/*` and would bounce a non-kid host principal)
// while keeping the editor fully EDITABLE. The kid default (not embedded) is
// unchanged — Home is present + interactive.
describe('BlocksStudioPage embedded (host-owned Back)', () => {
  it('hides the Home/back link but keeps the editor interactive', async () => {
    await renderStudio(false, true);
    // The 🏠 home link (kid + demo) is gone — the host's own chrome carries Back.
    expect(screen.queryByTitle('Save & back')).not.toBeInTheDocument();
    expect(screen.queryByTestId('demo-home')).not.toBeInTheDocument();
    // Editable, NOT read-only: edit affordances stay interactive (no dimming).
    for (const testId of ['palette', 'add-character', 'add-page', 'scene-btn']) {
      const el = screen.getByTestId(testId);
      expect(el).not.toHaveClass('pointer-events-none');
      expect(el).not.toHaveClass('opacity-60');
    }
    expect(screen.getByTestId('add-character')).not.toBeDisabled();
  });

  it('kid default (not embedded) still shows the Home/back link', async () => {
    await renderStudio(false, false);
    expect(screen.getByTitle('Save & back')).toBeInTheDocument();
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
                { op: 'say', text: '你好，我刚刚来到这里。' },
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
      { op: 'say', text: '你好，我刚刚来到这里。' },
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
                { op: 'say', text: '你好，我刚刚来到这里。' },
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

  it('makes A3-D observe a failed tap before replacing only Start with On Tap', async () => {
    const eventDebug = blankProject('Tiny Star Village · The Wrong Start Hat');
    eventDebug.lessonId = 'tsv-s1-a3-d';
    eventDebug.pages[0] = {
      id: 'tsv-a3-d-page',
      background: 'tsv-rooftop',
      characters: [{
        id: 'dot-dot', name: 'Dot Dot', emoji: '🐱',
        asset: '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
        start: { gx: 10, gy: 8, size: 1, rot: 0 },
        scripts: [{
          id: 'dot-dot-event',
          blocks: [{ op: 'when_flag' }, { op: 'hop', n: 1 }, { op: 'end' }],
        }],
      }],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: eventDebug, version: 1, history: { past: [], future: [] }, otherFiles: [],
    });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-scene-state', 'before');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-rooftop',
    );
    fireEvent.click(screen.getAllByTestId('block-when_flag').at(-1)!);
    expect(screen.queryByTestId('event-repair-picker')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    const dot = screen.getByTestId('sprite-dot-dot');
    dot.setPointerCapture = vi.fn();
    dot.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(dot);
    fireEvent.pointerUp(dot);
    expect(await screen.findByTestId('story-mission')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getAllByTestId('block-when_flag').at(-1)!);
    expect(screen.getByTestId('event-repair-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('event-repair-when_tap'));

    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_tap' }, { op: 'hop', n: 1 }, { op: 'end' },
    ]);
    await waitFor(() => expect(saveBlocksProject).toHaveBeenCalled());
    fireEvent.pointerDown(dot);
    fireEvent.pointerUp(dot);
    expect(await screen.findByTestId('story-celebration', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-rooftop-awake-lit',
    );
  });

  it('lets A4-B change only the existing movement parameter', async () => {
    const breakfast = blankProject('Tiny Star Village · Breakfast');
    breakfast.lessonId = 'tsv-s1-a4-b';
    breakfast.pages[0] = {
      id: 'tsv-a4-b-page', background: 'tsv-breakfast-stop-distance-3', characters: [
        { id: 'breakfast-cart', name: 'Breakfast Cart', emoji: '🚙', asset: '/story-blocks/tiny-star-village/props/breakfast-cart-right-v01.png', start: { gx: 4, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'breakfast-cart-build', blocks: [{ op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'end' }] }] },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: breakfast, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getAllByTestId('block-when_flag').at(-1)!);
    expect(screen.queryByTestId('block-editor')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('block-move_right').at(-1)!);
    expect(screen.getByTestId('num-value')).toHaveTextContent('1');
    fireEvent.click(screen.getByTestId('num-plus'));
    fireEvent.click(screen.getByTestId('num-plus'));
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' },
    ]);
  });

  it('lets A4-S choose its own stop, parcel and matching movement number', async () => {
    const delivery = blankProject('Tiny Star Village · My Delivery Stop');
    delivery.lessonId = 'tsv-s1-a4-s';
    delivery.pages[0] = {
      id: 'tsv-a4-s-page', background: 'tsv-breakfast-stop-distance-1', characters: [
        { id: 'breakfast-cart', name: 'Breakfast Cart', emoji: '🚙', asset: '/story-blocks/tiny-star-village/props/breakfast-cart-right-v01.png', start: { gx: 4, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'breakfast-cart-ship', blocks: [{ op: 'when_flag' }, { op: 'end' }] }] },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: delivery, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    const studio = await renderStudio();
    expect(studio).toHaveClass('has-home-picker');
    const stopTwo = screen.getByTestId('a4-s-stop-2');
    expect(stopTwo).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(stopTwo);
    fireEvent.click(screen.getByTestId('a4-s-parcel-gift'));
    expect(stopTwo).toHaveAttribute('aria-pressed', 'true');
    expect(useBlocksStore.getState().project.pages[0]).toMatchObject({
      background: 'tsv-breakfast-stop-distance-2',
      characters: [
        expect.objectContaining({
          id: 'breakfast-cart',
          name: 'Gift Breakfast',
          emoji: '🎁',
          start: expect.objectContaining({ gx: 4, gy: 10 }),
        }),
      ],
    });
    // The picker never inserts a block — the route is still empty.
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' }, { op: 'end' },
    ]);

    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getByTestId('cat-motion'));
    const rightPalette = screen.getByTestId('palette').querySelector('[data-testid="block-move_right"]');
    fireEvent.pointerDown(rightPalette!);
    fireEvent.pointerUp(rightPalette!);
    // The route block lands before End at one space; the child raises it to two.
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 1 }, { op: 'end' },
    ]);
    fireEvent.click(screen.getAllByTestId('block-move_right').at(-1)!);
    fireEvent.click(screen.getByTestId('num-plus'));
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 2 }, { op: 'end' },
    ]);

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveAttribute('data-status', 'saved'));
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-success', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a4-s': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  });

  // Tiny Star Village A5-H — chapter five's Story Hook. Both friends ship a
  // finished `Start → Say → End`, so the real runner opens both speech bubbles
  // in the same tick. That overlap is the ONLY evidence the Hook accepts.
  const greetingHookProject = () => {
    const greeting = blankProject('Tiny Star Village · Who Is Speaking?');
    greeting.lessonId = 'tsv-s1-a5-h';
    greeting.pages[0] = {
      id: 'tsv-a5-h-page', background: 'tsv-greeting-stage', characters: [
        { id: 'little-light', name: 'Lumilo', emoji: '⭐', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png', start: { gx: 7, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'little-light-greeting', blocks: [{ op: 'when_flag' }, { op: 'say', text: 'Morning!' }, { op: 'end' }] }] },
        { id: 'tuan-tuan', name: 'Tuan Tuan', emoji: '🐻', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png', start: { gx: 12, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'tuan-tuan-greeting', blocks: [{ op: 'when_flag' }, { op: 'say', text: 'Morning too!' }, { op: 'end' }] }] },
      ],
    };
    return greeting;
  };

  it('completes A5-H only after a run whose two greetings overlapped', async () => {
    const greeting = greetingHookProject();
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: greeting, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-scene-state', 'before');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-greeting-stage',
    );
    expect(screen.getByTestId('sprite-little-light')).toHaveAttribute('data-gx', '7');
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '12');
    expect(screen.queryByTestId('speech-bubble-little-light')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('go-button'));
    // Both bubbles are open together — the collision the child has to name.
    expect(await screen.findByTestId('speech-bubble-little-light')).toHaveTextContent('Morning!');
    expect(screen.getByTestId('speech-bubble-tuan-tuan')).toHaveTextContent('Morning too!');

    expect(await screen.findByTestId('story-mission-question', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();

    // Naming one friend as the first speaker is wrong: nobody went first.
    fireEvent.click(screen.getByTestId('story-choice-lumilo'));
    expect(screen.getByRole('status')).toHaveTextContent('Did one of them wait');
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('story-choice-tuan-tuan'));
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('story-choice-together'));
    expect(await screen.findByTestId('story-hook-complete')).toHaveTextContent('both bubbles open at once');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-state',
      'before',
    );
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-greeting-stage',
    );
    // An Explore hook stays quiet: no chapter celebration.
    expect(screen.queryByTestId('story-celebration')).not.toBeInTheDocument();
    // Observation only — neither program was touched.
    expect(useBlocksStore.getState().project.pages[0].characters.map((c) => c.scripts[0].blocks)).toEqual([
      [{ op: 'when_flag' }, { op: 'say', text: 'Morning!' }, { op: 'end' }],
      [{ op: 'when_flag' }, { op: 'say', text: 'Morning too!' }, { op: 'end' }],
    ]);
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a5-h': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  });

  it('refuses A5-H once a child has edited one of the shipped greeting chains', async () => {
    const greeting = greetingHookProject();
    // The A5-B Wait belongs to the NEXT scene; adding it here means the child is
    // no longer observing the collision the Hook ships.
    greeting.pages[0].characters[1].scripts[0].blocks.splice(1, 0, { op: 'wait', n: 5 });
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: greeting, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-scene-state', 'before');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-greeting-stage',
    );
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-question', {}, { timeout: 4000 })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('story-choice-together'));
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();
    expect(saveBlocksProject).not.toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a5-h': expect.anything() }),
        }),
      }),
    );
  });

  // Tiny Star Village A6-H — chapter six's Story Hook. The shipped route walks
  // to the tower and rings the bell with no Hop in between, so the run itself is
  // the question. The Hook accepts one proof only: the interpreter played the
  // bell, never reached a Hop, and left the ringer at the foot of the tower.
  const bellHookProject = () => {
    const bell = blankProject('Tiny Star Village · Three Bell Tower Cards');
    bell.lessonId = 'tsv-s1-a6-h';
    bell.pages[0] = {
      id: 'tsv-a6-h-page', background: 'tsv-clocktower-path', characters: [
        { id: 'little-light', name: 'Lumilo', emoji: '⭐', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png', start: { gx: 5, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'little-light-bell-route', blocks: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'pop' }, { op: 'end' }] }] },
        { id: 'bell-tower', name: 'Bell Tower', emoji: '⭐', start: { gx: 8, gy: 7, size: 0.8, rot: 0 }, scripts: [] },
      ],
    };
    return bell;
  };

  it('completes A6-H only after a run that rang the bell with nobody hopping', async () => {
    const bell = bellHookProject();
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: bell, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-scene-state', 'before');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-clocktower-path',
    );
    expect(screen.getByTestId('sprite-little-light')).toHaveAttribute('data-gx', '5');
    const tower = screen.getByTestId('sprite-bell-tower');
    expect(tower).toHaveAttribute('data-gx', '8');
    expect(tower).toHaveAttribute('data-gy', '7');
    expect(tower).toHaveAttribute('data-bell-state', 'still');
    expect(screen.getByTestId('morning-bell-visual')).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/props/morning-bell-still-v01.png',
    );

    // The runtime art is a locked story target, not editable project data.
    fireEvent.click(screen.getByTestId('char-thumb-bell-tower'));
    expect(screen.queryByTestId('remove-character-bell-tower')).not.toBeInTheDocument();
    fireEvent.pointerDown(tower, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(tower, { pointerId: 1, clientX: 200, clientY: 200 });
    fireEvent.pointerUp(tower, { pointerId: 1 });
    expect(tower).toHaveAttribute('data-gx', '8');
    expect(tower).toHaveAttribute('data-gy', '7');
    expect(useBlocksStore.getState().project.pages[0].characters[1]).toMatchObject({
      start: { gx: 8, gy: 7 },
      scripts: [],
    });
    expect(useBlocksStore.getState().project.pages[0].characters[1].asset).toBeUndefined();

    fireEvent.click(screen.getByTestId('go-button'));
    await waitFor(
      () => expect(tower).toHaveAttribute('data-bell-state', 'swing'),
      { timeout: 3000 },
    );
    expect(screen.getByTestId('morning-bell-visual')).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/props/morning-bell-swing-v01.png',
    );
    // The walk really happens: the ringer ends at the foot of the tower.
    await waitFor(
      () => expect(screen.getByTestId('sprite-little-light')).toHaveAttribute('data-gx', '8'),
      { timeout: 3000 },
    );
    expect(await screen.findByTestId('story-mission-question', {}, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(tower).toHaveAttribute('data-bell-state', 'still'), {
      timeout: 2000,
    });
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();

    // The two cards that DID happen are the distractors.
    fireEvent.click(screen.getByTestId('story-choice-walk'));
    expect(screen.getByRole('status')).toHaveTextContent('never happened');
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('story-choice-ring'));
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('story-choice-hop'));
    expect(await screen.findByTestId('story-hook-complete')).toHaveTextContent('missing from the middle');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-state',
      'before',
    );
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-clocktower-path',
    );
    // An Explore hook stays quiet: no chapter celebration.
    expect(screen.queryByTestId('story-celebration')).not.toBeInTheDocument();
    // Observation only — the route was never edited.
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'pop' }, { op: 'end' },
    ]);
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a6-h': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  });

  it('refuses A6-H once the missing Hop has been added — that is the next scene', async () => {
    const bell = bellHookProject();
    bell.pages[0].characters[0].scripts[0].blocks.splice(2, 0, { op: 'hop', n: 1 });
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: bell, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-question', {}, { timeout: 4000 })).toBeInTheDocument();

    // This run DID reach a Hop, so there is no "the bell rang alone" evidence
    // and the saved route is no longer the one the Explore scene ships.
    fireEvent.click(screen.getByTestId('story-choice-hop'));
    expect(screen.queryByTestId('story-hook-complete')).not.toBeInTheDocument();
    expect(saveBlocksProject).not.toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a6-h': expect.anything() }),
        }),
      }),
    );
  });

  // Tiny Star Village A6-B — chapter six's Logic Build. The same Bell Tower
  // route returns with the same missing middle card, and this time the child
  // puts it back. Completion needs the exact saved route AND a run in which the
  // interpreter really reached the Hop before the bell.
  const bellBuildProject = () => {
    const bell = bellHookProject();
    bell.lessonId = 'tsv-s1-a6-b';
    bell.pages[0].id = 'tsv-a6-b-page';
    return bell;
  };
  const bellRoute = () =>
    useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks;

  it('completes A6-B once the child puts the Hop between the walk and the bell', async () => {
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: bellBuildProject(), version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-scene-state', 'before');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-clocktower-path',
    );

    // The child taps Hop in the real Motion palette. A tap appends before the
    // terminal End — i.e. AFTER the bell — and on the block's own default of 2.
    fireEvent.click(screen.getByTestId('cat-motion'));
    const hopPalette = screen.getByTestId('palette').querySelector('[data-testid="block-hop"]');
    fireEvent.pointerDown(hopPalette!);
    fireEvent.pointerUp(hopPalette!);
    expect(bellRoute()).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'pop' }, { op: 'hop', n: 2 }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');

    // Dragging it in front of the Pop and dialling it to one space is the move
    // the mission is about.
    act(() => useBlocksStore.getState().moveBlock('little-light-bell-route', 3, 2));
    act(() => useBlocksStore.getState().setParam('little-light-bell-route', 2, 1));
    expect(bellRoute()).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'hop', n: 1 }, { op: 'pop' }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'true');
    // The script-less Bell Tower was never touched.
    expect(useBlocksStore.getState().project.pages[0].characters[1].scripts).toEqual([]);

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveAttribute('data-status', 'saved'), { timeout: 5000 });
    fireEvent.click(screen.getByTestId('go-button'));
    await waitFor(
      () => expect(screen.getByTestId('sprite-little-light')).toHaveAttribute('data-gx', '8'),
      { timeout: 5000 },
    );
    expect(await screen.findByTestId('story-mission-success', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a6-b': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  }, 30_000);

  it('refuses A6-B while the Hop still sits after the bell', async () => {
    const bell = bellBuildProject();
    // The block is there, but behind the Pop — the bell still rings first.
    bell.pages[0].characters[0].scripts[0].blocks.splice(3, 0, { op: 'hop', n: 1 });
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: bell, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getByTestId('go-button'));
    await waitFor(
      () => expect(screen.getByTestId('sprite-little-light')).toHaveAttribute('data-gx', '8'),
      { timeout: 5000 },
    );

    expect(await screen.findByTestId('story-build-task', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    expect(saveBlocksProject).not.toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a6-b': expect.anything() }),
        }),
      }),
    );
  }, 30_000);

  // Tiny Star Village A6-D — chapter six's Twist & Debug. All five blocks ship,
  // with the bell at the FRONT. The child must run the wrong order for real,
  // name the card that belongs last, and may then MOVE the Pop — nothing may be
  // added, deleted or retuned, and no number editor opens at all.
  const bellFixProject = () => {
    const bell = bellHookProject();
    bell.lessonId = 'tsv-s1-a6-d';
    bell.pages[0].id = 'tsv-a6-d-page';
    bell.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' }, { op: 'pop' }, { op: 'move_right', n: 3 }, { op: 'hop', n: 1 }, { op: 'end' },
    ];
    return bell;
  };

  it('makes A6-D run the early bell before the Pop may be moved', async () => {
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: bellFixProject(), version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute('data-story-scene-state', 'before');
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-clocktower-path',
    );

    // Before the bug has been watched the chain will not budge: tapping a block
    // opens no number editor, it sends the child back to the story card.
    fireEvent.click(screen.getAllByTestId('block-move_right').at(-1)!);
    expect(screen.queryByTestId('block-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('story-mission')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    // One real Go: the bell rings while the ringer is still three spaces away.
    fireEvent.click(screen.getByTestId('go-button'));
    const tower = screen.getByTestId('sprite-bell-tower');
    await waitFor(
      () => expect(tower).toHaveAttribute('data-bell-state', 'swing'),
      { timeout: 2000 },
    );
    expect(screen.getByTestId('morning-bell-visual')).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/props/morning-bell-swing-v01.png',
    );
    await waitFor(
      () => expect(screen.getByTestId('sprite-little-light')).toHaveAttribute('data-gx', '8'),
      { timeout: 5000 },
    );
    expect(await screen.findByTestId('story-mission-question', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-clocktower-path',
    );
    // The two cards that really do belong earlier are the distractors.
    fireEvent.click(screen.getByTestId('story-choice-walk'));
    expect(screen.queryByTestId('story-fix-task')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('story-choice-hop'));
    expect(screen.queryByTestId('story-fix-task')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('story-choice-ring'));
    expect(await screen.findByTestId('story-fix-task')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    // Even now nothing may be ADDED: the Motion palette is shut for this scene.
    fireEvent.click(screen.getByTestId('cat-motion'));
    const hopPalette = screen.getByTestId('palette').querySelector('[data-testid="block-hop"]');
    fireEvent.pointerDown(hopPalette!);
    fireEvent.pointerUp(hopPalette!);
    expect(bellRoute()).toHaveLength(5);

    // The whole repair is one move: the bell goes behind the jump.
    act(() => useBlocksStore.getState().moveBlock('little-light-bell-route', 1, 3));
    expect(bellRoute()).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'hop', n: 1 }, { op: 'pop' }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'true');
    // The script-less Bell Tower was never touched.
    expect(useBlocksStore.getState().project.pages[0].characters[1].scripts).toEqual([]);

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveAttribute('data-status', 'saved'), { timeout: 5000 });
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-success', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-clocktower-path-bell-lit',
    );
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a6-d': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  }, 40_000);

  it('refuses A6-D while the bell still rings before the jump', async () => {
    const bell = bellFixProject();
    // Moved one slot only: after the walk, but still before the hop.
    bell.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'pop' }, { op: 'hop', n: 1 }, { op: 'end' },
    ];
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: bell, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-question', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    expect(saveBlocksProject).not.toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a6-d': expect.anything() }),
        }),
      }),
    );
  }, 30_000);

  // Tiny Star Village A6-S — the season's Personal Ship. The three-step core
  // ships built and settled; nobody is cast as the ringer and there is no
  // ending, so only the child's two decisions can finish the season.
  const bellFinaleProject = () => {
    const bell = blankProject('Tiny Star Village · My Morning-Light Ending');
    bell.lessonId = 'tsv-s1-a6-s';
    bell.pages[0] = {
      id: 'tsv-a6-s-page', background: 'tsv-clocktower-path', characters: [
        { id: 'bell-ringer', name: 'Who will ring it?', emoji: '❓', start: { gx: 5, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'bell-ringer-finale', blocks: [{ op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'hop', n: 1 }, { op: 'pop' }, { op: 'end' }] }] },
        { id: 'bell-tower', name: 'Bell Tower', emoji: '⭐', start: { gx: 8, gy: 7, size: 0.8, rot: 0 }, scripts: [] },
      ],
    };
    return bell;
  };
  const finaleRoute = () =>
    useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks;

  it('completes A6-S once the child casts a ringer and adds their own ending', async () => {
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: bellFinaleProject(), version: 1, history: { past: [], future: [] }, otherFiles: [] });

    const studio = await renderStudio();
    expect(studio).toHaveClass('has-home-picker');
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    // The route runs, but nobody is standing at the tower and the morning has
    // no ending — the starter cannot complete itself.
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getByTestId('a6-s-ringer-dot-dot'));
    expect(screen.getByTestId('a6-s-ringer-dot-dot')).toHaveAttribute('aria-pressed', 'true');
    expect(useBlocksStore.getState().project.pages[0].characters[0]).toMatchObject({
      name: 'Dot Dot', emoji: '🐱', asset: '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
    });
    // The ringer buttons never insert a block: the core is still the settled one.
    expect(finaleRoute()).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'hop', n: 1 }, { op: 'pop' }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');

    // The ending comes from the real Looks palette. A tap lands it before the
    // terminal End — i.e. after the bell, which is exactly where it belongs —
    // and it arrives with the editor's own 'Hi!', which is not an ending line.
    fireEvent.click(screen.getByTestId('cat-looks'));
    const sayPalette = screen.getByTestId('palette').querySelector('[data-testid="block-say"]');
    fireEvent.pointerDown(sayPalette!);
    fireEvent.pointerUp(sayPalette!);
    expect(finaleRoute()).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'hop', n: 1 }, { op: 'pop' }, { op: 'say', text: 'Hi!' }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');

    fireEvent.click(screen.getAllByTestId('block-say').at(-1)!);
    const endings = screen.getByTestId('story-greeting-picker').querySelectorAll('button');
    expect(endings).toHaveLength(3);
    fireEvent.click(endings[2]);
    expect(finaleRoute()).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'hop', n: 1 }, { op: 'pop' }, { op: 'say', text: 'We did it!' }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'true');
    // The script-less Bell Tower was never touched.
    expect(useBlocksStore.getState().project.pages[0].characters[1].scripts).toEqual([]);

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveAttribute('data-status', 'saved'), { timeout: 5000 });
    fireEvent.click(screen.getByTestId('go-button'));
    await waitFor(
      () => expect(screen.getByTestId('sprite-bell-ringer')).toHaveAttribute('data-gx', '8'),
      { timeout: 5000 },
    );
    expect(await screen.findByTestId('speech-bubble-bell-ringer', {}, { timeout: 5000 })).toHaveTextContent('We did it!');
    expect(await screen.findByTestId('story-mission-success', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-scene',
      'tsv-clocktower-path',
    );
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-state',
      'resolved',
    );
    expect(screen.getByTestId('blocks-stage')).toHaveAttribute(
      'data-story-scene-visual',
      'tsv-clocktower-path-bell-lit',
    );
    const ringerSuccess = screen.getByTestId('sprite-bell-ringer').querySelector('img');
    expect(ringerSuccess).toHaveAttribute('data-performance', 'success');
    expect(ringerSuccess).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/characters/dot-dot/success-joyful-v01.png',
    );
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a6-s': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  }, 40_000);

  it('refuses an A6-S ending that happens before the bell, and finishes once it is cast', async () => {
    const bell = bellFinaleProject();
    // A perfectly good ending block — in front of the bell, so the last word
    // happens while the morning light is still missing. And nobody is cast.
    bell.pages[0].characters[0].scripts[0].blocks.splice(3, 0, { op: 'grow', n: 2 });
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: bell, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getByTestId('go-button'));
    await waitFor(
      () => expect(screen.getByTestId('sprite-bell-ringer')).toHaveAttribute('data-gx', '8'),
      { timeout: 5000 },
    );
    expect(await screen.findByTestId('story-build-task', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    expect(saveBlocksProject).not.toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a6-s': expect.anything() }),
        }),
      }),
    );

    // Casting a ringer is not enough while the ending is still in front of the
    // bell; moving it behind the Pop is what finishes the season.
    fireEvent.click(screen.getByTestId('a6-s-ringer-lumilo'));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    act(() => useBlocksStore.getState().moveBlock('bell-ringer-finale', 3, 4));
    expect(finaleRoute()).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'hop', n: 1 }, { op: 'pop' }, { op: 'grow', n: 2 }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'true');
  }, 40_000);

  // Tiny Star Village A5-B — chapter five's Logic Build. The A5-H stage returns
  // with Tuan Tuan's chain still in the collision shape; the child adds one Wait
  // and has to put it BEFORE the Say. Completion needs the exact saved chain AND
  // a run in which the interpreter really opened Tuan Tuan's bubble later.
  const greetingBuildProject = () => {
    const greeting = blankProject('Tiny Star Village · Wait a Moment');
    greeting.lessonId = 'tsv-s1-a5-b';
    greeting.pages[0] = {
      id: 'tsv-a5-b-page', background: 'tsv-greeting-stage', characters: [
        { id: 'little-light', name: 'Lumilo', emoji: '⭐', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png', start: { gx: 7, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'little-light-greeting', blocks: [{ op: 'when_flag' }, { op: 'say', text: 'Morning!' }, { op: 'end' }] }] },
        { id: 'tuan-tuan', name: 'Tuan Tuan', emoji: '🐻', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png', start: { gx: 12, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'tuan-tuan-greeting', blocks: [{ op: 'when_flag' }, { op: 'say', text: 'Morning too!' }, { op: 'end' }] }] },
      ],
    };
    return greeting;
  };
  const tuanTuanBlocks = () =>
    useBlocksStore.getState().project.pages[0].characters[1].scripts[0].blocks;

  it('completes A5-B once the child moves the Wait in front of Tuan Tuan’s Say', async () => {
    const greeting = greetingBuildProject();
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: greeting, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    // The child opens Tuan Tuan and taps Wait in the real Control palette. A tap
    // appends before the terminal End — i.e. AFTER the Say, which changes nothing.
    fireEvent.click(screen.getByTestId('char-thumb-tuan-tuan'));
    fireEvent.click(screen.getByTestId('cat-control'));
    const waitPalette = screen.getByTestId('palette').querySelector('[data-testid="block-wait"]');
    fireEvent.pointerDown(waitPalette!);
    fireEvent.pointerUp(waitPalette!);
    expect(tuanTuanBlocks()).toEqual([
      { op: 'when_flag' }, { op: 'say', text: 'Morning too!' }, { op: 'wait', n: 5 }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');

    // Dragging it in front of the Say is the move the mission is about.
    act(() => useBlocksStore.getState().moveBlock('tuan-tuan-greeting', 2, 1));
    expect(tuanTuanBlocks()).toEqual([
      { op: 'when_flag' }, { op: 'wait', n: 5 }, { op: 'say', text: 'Morning too!' }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'true');
    // Lumilo's half of the duet was never touched.
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' }, { op: 'say', text: 'Morning!' }, { op: 'end' },
    ]);

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveAttribute('data-status', 'saved'), { timeout: 5000 });
    fireEvent.click(screen.getByTestId('go-button'));
    // Lumi opens alone; Tuan Tuan's greeting arrives a real half-second later.
    expect(await screen.findByTestId('speech-bubble-little-light', {}, { timeout: 5000 })).toHaveTextContent('Morning!');
    expect(screen.queryByTestId('speech-bubble-tuan-tuan')).not.toBeInTheDocument();
    expect(await screen.findByTestId('speech-bubble-tuan-tuan', {}, { timeout: 5000 })).toHaveTextContent('Morning too!');

    expect(await screen.findByTestId('story-mission-success', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a5-b': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  }, 30_000);

  it('refuses A5-B while the Wait still sits after Tuan Tuan’s Say', async () => {
    const greeting = greetingBuildProject();
    // The block is there, but behind the Say — both friends still open together.
    greeting.pages[0].characters[1].scripts[0].blocks.splice(2, 0, { op: 'wait', n: 5 });
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: greeting, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('speech-bubble-little-light', {}, { timeout: 5000 })).toHaveTextContent('Morning!');
    expect(screen.getByTestId('speech-bubble-tuan-tuan')).toHaveTextContent('Morning too!');

    expect(await screen.findByTestId('story-build-task', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    expect(saveBlocksProject).not.toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a5-b': expect.anything() }),
        }),
      }),
    );
  }, 30_000);

  // Tiny Star Village A5-S — chapter five's Personal Ship. The starter casts ONE
  // friend into BOTH spots and ships two empty chains, so nothing but the
  // child's own cast, greetings and Wait can complete it.
  const duetShipProject = () => {
    const duet = blankProject('Tiny Star Village · My Two-Friend Greeting');
    duet.lessonId = 'tsv-s1-a5-s';
    duet.pages[0] = {
      id: 'tsv-a5-s-page', background: 'tsv-greeting-stage', characters: [
        { id: 'greeter-one', name: 'Lumilo', emoji: '⭐', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png', start: { gx: 7, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'greeter-one-duet', blocks: [{ op: 'when_flag' }, { op: 'end' }] }] },
        { id: 'greeter-two', name: 'Lumilo', emoji: '⭐', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png', start: { gx: 12, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'greeter-two-duet', blocks: [{ op: 'when_flag' }, { op: 'end' }] }] },
      ],
    };
    return duet;
  };
  const duetBlocks = (index: number) =>
    useBlocksStore.getState().project.pages[0].characters[index].scripts[0].blocks;

  it('lets A5-S cast two friends, build both hellos and celebrate a run that took turns', async () => {
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: duetShipProject(), version: 1, history: { past: [], future: [] }, otherFiles: [] });

    const studio = await renderStudio();
    expect(studio).toHaveClass('has-home-picker');
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    // One friend is standing in both spots — that is not a duet.
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getByTestId('a5-s-second-tuan-tuan'));
    expect(screen.getByTestId('a5-s-second-tuan-tuan')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('a5-s-first-lumilo')).toHaveAttribute('aria-pressed', 'true');
    expect(useBlocksStore.getState().project.pages[0].characters[1]).toMatchObject({
      name: 'Tuan Tuan', emoji: '🐻', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
    });
    // The cast buttons never insert a block — both chains are still empty.
    expect(duetBlocks(0)).toEqual([{ op: 'when_flag' }, { op: 'end' }]);
    expect(duetBlocks(1)).toEqual([{ op: 'when_flag' }, { op: 'end' }]);

    // Lumi greets first, out loud. The Say arrives with the block's own 'Hi!',
    // which is NOT a village greeting, so the child picks a real one.
    fireEvent.click(screen.getByTestId('cat-looks'));
    const sayPalette = screen.getByTestId('palette').querySelector('[data-testid="block-say"]');
    fireEvent.pointerDown(sayPalette!);
    fireEvent.pointerUp(sayPalette!);
    expect(duetBlocks(0)).toEqual([{ op: 'when_flag' }, { op: 'say', text: 'Hi!' }, { op: 'end' }]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getAllByTestId('block-say').at(-1)!);
    const greetings = screen.getByTestId('story-greeting-picker').querySelectorAll('button');
    fireEvent.click(greetings[0]);
    expect(duetBlocks(0)).toEqual([
      { op: 'when_flag' }, { op: 'say', text: 'Morning!' }, { op: 'end' },
    ]);

    // Tuan Tuan waits, then bounces back. The Hop arrives at one space because
    // the number this scene teaches is the Wait.
    fireEvent.click(screen.getByTestId('char-thumb-greeter-two'));
    fireEvent.click(screen.getByTestId('cat-control'));
    const waitPalette = screen.getByTestId('palette').querySelector('[data-testid="block-wait"]');
    fireEvent.pointerDown(waitPalette!);
    fireEvent.pointerUp(waitPalette!);
    fireEvent.click(screen.getByTestId('cat-motion'));
    const hopPalette = screen.getByTestId('palette').querySelector('[data-testid="block-hop"]');
    fireEvent.pointerDown(hopPalette!);
    fireEvent.pointerUp(hopPalette!);
    expect(duetBlocks(1)).toEqual([
      { op: 'when_flag' }, { op: 'wait', n: 5 }, { op: 'hop', n: 1 }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'true');

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveAttribute('data-status', 'saved'), { timeout: 5000 });
    fireEvent.click(screen.getByTestId('go-button'));
    // Lumi speaks alone before Tuan Tuan answers half a second later.
    expect(await screen.findByTestId('speech-bubble-greeter-one', {}, { timeout: 5000 })).toHaveTextContent('Morning!');
    expect(await screen.findByTestId('story-mission-success', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a5-s': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  }, 30_000);

  it('refuses an A5-S duet in which one friend is cast in both spots', async () => {
    const duet = duetShipProject();
    // Both chains are perfectly built — but they belong to the same friend, so
    // nobody is greeting anybody.
    duet.pages[0].characters[0].scripts[0].blocks = [
      { op: 'when_flag' }, { op: 'hop', n: 1 }, { op: 'end' },
    ];
    duet.pages[0].characters[1].scripts[0].blocks = [
      { op: 'when_flag' }, { op: 'wait', n: 5 }, { op: 'hop', n: 1 }, { op: 'end' },
    ];
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: duet, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-build-task', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    expect(saveBlocksProject).not.toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a5-s': expect.anything() }),
        }),
      }),
    );

    // Casting a second friend is the missing piece, and it needs no new block.
    fireEvent.click(screen.getByTestId('a5-s-second-dot-dot'));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'true');
    expect(duetBlocks(0)).toEqual([{ op: 'when_flag' }, { op: 'hop', n: 1 }, { op: 'end' }]);
  }, 30_000);

  // Tiny Star Village A5-D — chapter five's Twist & Debug. Every block is in the
  // right order; only Tuan Tuan's Wait number is wrong. The child must run the
  // too-long pause for real, name the direction of the repair, and may then edit
  // that one number — nothing else on the page is editable.
  const relayDebugProject = () => {
    const relay = blankProject('Tiny Star Village · That Wait Was Too Long');
    relay.lessonId = 'tsv-s1-a5-d';
    relay.pages[0] = {
      id: 'tsv-a5-d-page', background: 'tsv-greeting-stage', characters: [
        { id: 'little-light', name: 'Lumilo', emoji: '⭐', asset: '/story-blocks/tiny-star-village/characters/little-light/resting-calm-v01.png', start: { gx: 7, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'little-light-bounce', blocks: [{ op: 'when_flag' }, { op: 'hop', n: 1 }, { op: 'end' }] }] },
        { id: 'tuan-tuan', name: 'Tuan Tuan', emoji: '🐻', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png', start: { gx: 12, gy: 10, size: 1, rot: 0 }, scripts: [{ id: 'tuan-tuan-bounce', blocks: [{ op: 'when_flag' }, { op: 'wait', n: 9 }, { op: 'hop', n: 1 }, { op: 'end' }] }] },
      ],
    };
    return relay;
  };
  const tuanTuanRelay = () =>
    useBlocksStore.getState().project.pages[0].characters[1].scripts[0].blocks;

  it('makes A5-D run the too-long Wait before its number can be retuned', async () => {
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: relayDebugProject(), version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getByTestId('char-thumb-tuan-tuan'));
    // Before the bug has been watched, the hourglass will not open.
    fireEvent.click(screen.getAllByTestId('block-wait').at(-1)!);
    expect(screen.queryByTestId('block-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('story-mission')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    // One real Go: Lumilo bounces, lands, and the stage stands empty for the
    // rest of the 900 ms before Tuan Tuan answers.
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-question', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    // Guessing "more" does not open the repair.
    fireEvent.click(screen.getByTestId('story-choice-more'));
    expect(screen.queryByTestId('story-fix-task')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('story-choice-less'));
    expect(await screen.findByTestId('story-fix-task')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));

    // Only the Wait is editable, and only its number changes.
    fireEvent.click(screen.getAllByTestId('block-hop').at(-1)!);
    expect(screen.queryByTestId('block-editor')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByTestId('block-wait').at(-1)!);
    expect(screen.getByTestId('num-value')).toHaveTextContent('9');
    for (let step = 0; step < 4; step += 1) fireEvent.click(screen.getByTestId('num-minus'));
    expect(tuanTuanRelay()).toEqual([
      { op: 'when_flag' }, { op: 'wait', n: 5 }, { op: 'hop', n: 1 }, { op: 'end' },
    ]);
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'true');
    // Lumilo's half of the relay was never touched.
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' }, { op: 'hop', n: 1 }, { op: 'end' },
    ]);

    await waitFor(() => expect(screen.getByTestId('save-status')).toHaveAttribute('data-status', 'saved'), { timeout: 5000 });
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-success', {}, { timeout: 10_000 })).toBeInTheDocument();
    expect(saveBlocksProject).toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({
            'tsv-s1-a5-d': expect.objectContaining({ completedAt: expect.any(String) }),
          }),
        }),
      }),
    );
  }, 40_000);

  it('refuses A5-D when the retuned Wait makes both friends bounce at once', async () => {
    const relay = relayDebugProject();
    // The child overshot the repair: Wait 1 puts the two bounces back on top of
    // each other, which is the A5-B collision all over again.
    relay.pages[0].characters[1].scripts[0].blocks[1] = { op: 'wait', n: 1 };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({ project: relay, version: 1, history: { past: [], future: [] }, otherFiles: [] });

    await renderStudio();
    fireEvent.click(await screen.findByRole('button', { name: 'Close story mission' }));
    expect(screen.getByTestId('blocks-studio')).toHaveAttribute('data-story-target-fixed', 'false');
    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-question', {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.queryByTestId('story-mission-success')).not.toBeInTheDocument();
    expect(saveBlocksProject).not.toHaveBeenCalledWith(
      expect.objectContaining({
        storyProgress: expect.objectContaining({
          completed: expect.objectContaining({ 'tsv-s1-a5-d': expect.anything() }),
        }),
      }),
    );
  }, 30_000);

  it('changes the saved A3-S character without inserting a response', async () => {
    const personal = blankProject('Tiny Star Village · My Tap Surprise');
    personal.lessonId = 'tsv-s1-a3-s';
    personal.pages[0] = {
      id: 'tsv-a3-s-page', background: 'tsv-rooftop', characters: [{
        id: 'dot-dot', name: 'Dot Dot', emoji: '🐱',
        asset: '/story-blocks/tiny-star-village/characters/dot-dot/standing-calm-v01.png',
        start: { gx: 10, gy: 8, size: 1, rot: 0 },
        scripts: [{ id: 'dot-dot-surprise', blocks: [{ op: 'when_tap' }, { op: 'end' }] }],
      }],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: personal, version: 1, history: { past: [], future: [] }, otherFiles: [],
    });

    await renderStudio();
    fireEvent.click(screen.getByTestId('a3-s-character-tuan-tuan'));
    expect(useBlocksStore.getState().project.pages[0].characters[0]).toMatchObject({
      name: 'Tuan Tuan', asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting-happy-v01.png',
    });
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_tap' }, { op: 'end' },
    ]);
    await waitFor(() => expect(saveBlocksProject).toHaveBeenCalled());
  });

  // Load-error dead-end (review finding): the error state must NOT expose a
  // `/learn/create/blocks` link when embedded — it would bounce a teacher `user`
  // to `/portal`. The host banner's Back is the only exit.
  it('load-error state hides the /learn link when embedded', async () => {
    vi.mocked(loadBlocksProject).mockRejectedValueOnce(new Error('boom'));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <BlocksStudioPage projectId="p1" embedded />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/couldn.t open/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Back to Blocks/i })).not.toBeInTheDocument();
  });

  it('load-error state DOES show the /learn link for the kid default (not embedded)', async () => {
    vi.mocked(loadBlocksProject).mockRejectedValueOnce(new Error('boom'));
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <BlocksStudioPage projectId="p1" />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/couldn.t open/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Blocks/i })).toBeInTheDocument();
  });
});

// Regression: local edits silently reverted a couple seconds after being made.
// Cause — autosaves weren't serialized: a save firing while another was still
// in flight reused the same base `version` (it only advances when a save
// RETURNS), so the second PUT sent a stale `expected_version`, 409'd, and the
// conflict handler reloaded the server's older snapshot, dropping the edits.
describe('BlocksStudioPage autosave serialization', () => {
  const mockedSave = vi.mocked(saveBlocksProject);

  afterEach(() => {
    // afterEach's clearAllMocks keeps mockImplementation — reset to the default.
    mockedSave.mockReset();
    mockedSave.mockResolvedValue({ status: 'saved', version: 2 });
  });

  it('never has two saves in flight and the follow-up uses the fresh version', async () => {
    // Make the FIRST save block (deferred) so a second edit can land mid-flight.
    let resolveFirst: ((v: { status: 'saved'; version: number }) => void) | null = null;
    mockedSave
      .mockImplementationOnce(
        () =>
          new Promise((res) => {
            resolveFirst = res;
          }),
      )
      .mockResolvedValue({ status: 'saved', version: 3 });

    await renderStudio(); // loads with version: 1

    // Edit #1 → after the 800ms debounce, save #1 fires and stays in flight.
    act(() => useBlocksStore.getState().addBlock('when_flag'));
    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(1));
    expect(mockedSave.mock.calls[0][0].version).toBe(1);

    // Edit #2 while save #1 is still in flight. Its debounce must NOT launch a
    // concurrent save — it's queued behind the running one.
    act(() => useBlocksStore.getState().addBlock('move_right'));
    await new Promise((r) => setTimeout(r, 1000)); // > SAVE_DEBOUNCE_MS
    expect(mockedSave).toHaveBeenCalledTimes(1);

    // Resolving save #1 (version 1→2) must trigger the queued follow-up, and it
    // must carry the FRESH version 2 — not a stale 1 that would 409 and revert.
    await act(async () => {
      resolveFirst?.({ status: 'saved', version: 2 });
    });
    await waitFor(() => expect(mockedSave).toHaveBeenCalledTimes(2));
    expect(mockedSave.mock.calls[1][0].version).toBe(2);
  });
});
