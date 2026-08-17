// @vitest-environment jsdom
// Tiny Star Village chapters three and four — the On Tap swap (A3-D), the
// single-parameter edits (A4-B / A4-S) and the A3-S character change. Split
// out of BlocksStudioPage.test.tsx so each season runs in its own worker.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

describe('BlocksStudioPage Tiny Star season A3–A4 missions', () => {
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
});
