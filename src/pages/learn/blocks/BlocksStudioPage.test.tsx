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

import { createBlocksProject, loadBlocksProject, saveBlocksProject } from './blocksApi';
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
    expect(screen.getByTestId('story-lumilo').querySelector('img')).toHaveAttribute(
      'src',
      '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
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
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
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
          asset: '/story-blocks/tiny-star-village/characters/little-light/resting.svg',
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
    expect(screen.getByTestId('story-completion-evidence')).toHaveTextContent('Work saved');
    fireEvent.click(screen.getByTestId('story-next-mission'));
    await waitFor(() =>
      expect(createBlocksProject).toHaveBeenCalledWith({
        template: 'blocks_tsv_a1_s',
        title: 'Tiny Star Village · My morning greeting',
      }),
    );
  });

  it('completes A2-H only after the unchanged wrong-way run and a farther observation', async () => {
    const directionProject = blankProject('Tiny Star Village · Which Way?');
    directionProject.lessonId = 'tsv-s1-a2-h';
    directionProject.pages[0] = {
      id: 'tsv-a2-h-page',
      background: 'tsv-cloud-path-meadow',
      characters: [
        {
          id: 'tuan-tuan',
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'tuan-tuan-flag',
              blocks: [{ op: 'when_flag' }, { op: 'move_left', n: 3 }, { op: 'end' }],
            },
          ],
        },
        {
          id: 'plaza-target',
          name: 'Plaza Star',
          emoji: '⭐',
          start: { gx: 11, gy: 10, size: 0.8, rot: 0 },
          scripts: [],
        },
      ],
    };
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
    expect(screen.getByTestId('sprite-plaza-target')).toHaveAttribute('data-gx', '11');

    fireEvent.click(screen.getByTestId('go-button'));
    expect(
      await screen.findByTestId('story-mission-question', {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '5');
    expect(screen.getByTestId('sprite-plaza-target')).toHaveAttribute('data-gx', '11');
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
  });

  it('makes A2-B palette arrows fixed at 3, inserts before End, and completes only at gx11', async () => {
    const directionBuild = blankProject('Tiny Star Village · Choose an Arrow');
    directionBuild.lessonId = 'tsv-s1-a2-b';
    directionBuild.pages[0] = {
      id: 'tsv-a2-b-page',
      background: 'tsv-cloud-path-meadow',
      characters: [
        {
          id: 'tuan-tuan',
          name: 'Tuan Tuan',
          emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [
            {
              id: 'tuan-tuan-flag',
              blocks: [{ op: 'when_flag' }, { op: 'end' }],
            },
          ],
        },
        {
          id: 'plaza-target',
          name: 'Plaza Star',
          emoji: '⭐',
          start: { gx: 11, gy: 10, size: 0.8, rot: 0 },
          scripts: [],
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
      background: 'tsv-cloud-path-meadow',
      characters: [
        {
          id: 'tuan-tuan', name: 'Tuan Tuan', emoji: '☁️',
          asset: '/story-blocks/tiny-star-village/characters/cloud-bear/resting.svg',
          start: { gx: 8, gy: 10, size: 1, rot: 0 },
          scripts: [{ id: 'tuan-tuan-flag', blocks: [{ op: 'when_flag' }, { op: 'move_left', n: 3 }, { op: 'end' }] }],
        },
        { id: 'plaza-target', name: 'Plaza Star', emoji: '⭐', start: { gx: 11, gy: 10, size: 0.8, rot: 0 }, scripts: [] },
      ],
    };
    vi.mocked(loadBlocksProject).mockResolvedValueOnce({
      project: directionDebug, version: 1, history: { past: [], future: [] }, otherFiles: [],
    });

    await renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Close story mission' }));
    fireEvent.click(screen.getAllByTestId('block-move_left').at(-1)!);
    expect(screen.queryByTestId('direction-repair-picker')).not.toBeInTheDocument();
    expect(screen.getByTestId('story-mission')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close story mission' }));

    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-build-task', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '5');
    fireEvent.click(screen.getByRole('button', { name: 'Keep building ▶' }));

    fireEvent.click(screen.getAllByTestId('block-move_left').at(-1)!);
    expect(screen.getByTestId('direction-repair-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('direction-repair-move_right'));
    expect(useBlocksStore.getState().project.pages[0].characters[0].scripts[0].blocks).toEqual([
      { op: 'when_flag' }, { op: 'move_right', n: 3 }, { op: 'end' },
    ]);
    await waitFor(() => expect(saveBlocksProject).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('go-button'));
    expect(await screen.findByTestId('story-mission-success', {}, { timeout: 3000 })).toHaveTextContent('changed only its arrow');
    expect(screen.getByTestId('sprite-tuan-tuan')).toHaveAttribute('data-gx', '11');
    expect(screen.getByTestId('story-celebration')).toBeInTheDocument();
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
