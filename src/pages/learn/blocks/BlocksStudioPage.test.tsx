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

import { loadBlocksProject, saveBlocksProject } from './blocksApi';
import { blankProject } from './blocksModel';
import { useBlocksStore } from './blocksStore';
import { BlocksStudioPage } from './BlocksStudioPage';

vi.mock('./blocksApi', () => ({
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
      'Far beyond the clouds is Tiny Star Village',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next page →' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start the mission ▶' }));
    expect(screen.queryByTestId('story-mission')).not.toBeInTheDocument();
    expect(screen.getByTestId('story-mission-launcher')).toBeInTheDocument();
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
    for (const testId of ['palette', 'add-character', 'add-page', 'scene-btn', 'trash-bin', 'undo', 'redo']) {
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
