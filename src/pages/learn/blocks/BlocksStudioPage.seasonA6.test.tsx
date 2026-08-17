// @vitest-environment jsdom
// Tiny Star Village chapter six — the bell-tower season: the no-Hop Hook
// (A6-H), the Hop-between Build (A6-B), the early-bell Debug (A6-D) and the
// cast-a-ringer Ship (A6-S). Split out of BlocksStudioPage.test.tsx so each
// season runs in its own vitest worker.

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

describe('BlocksStudioPage Tiny Star season A6 missions', () => {
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
});
