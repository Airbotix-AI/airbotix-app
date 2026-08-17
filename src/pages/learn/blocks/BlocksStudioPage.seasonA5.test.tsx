// @vitest-environment jsdom
// Tiny Star Village chapter five — the overlapping-greeting Hook (A5-H), the
// Wait-before-Say Build (A5-B), the two-friend duet Ship (A5-S) and the
// retuned-Wait Debug (A5-D). Split out of BlocksStudioPage.test.tsx so each
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

describe('BlocksStudioPage Tiny Star season A5 missions', () => {
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
});
