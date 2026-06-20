// @vitest-environment jsdom
// Zone label chips (learn-blocks-studio-prd.md clarity pass): every studio area
// wears an emoji-first name tag for pre-readers — 🎬 Stage, 🐱 Characters,
// 📖 Pages, 🧩 Blocks, ✨ What they do. Chips are decoration only (aria-hidden;
// the zones carry matching aria-labels) and disappear in present mode.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { blankProject } from './blocksModel';
import { useBlocksStore } from './blocksStore';
import { BlocksStudioPage } from './BlocksStudioPage';
import { saveBlocksProject } from './blocksApi';

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

async function renderStudio(readOnly = false) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <BlocksStudioPage projectId="p1" readOnly={readOnly} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return screen.findByTestId('blocks-studio');
}

describe('BlocksStudioPage zone labels', () => {
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
// blocks EDITOR renders from the VFS, but every edit affordance is gone and no
// mutation / autosave can happen.
describe('BlocksStudioPage read-only (teacher viewer)', () => {
  it('renders the editor layout (stage + program) but hides every edit affordance', async () => {
    await renderStudio(true);
    // The editor layout is present (the teacher sees what the kid built).
    expect(screen.getByTestId('blocks-stage')).toBeInTheDocument();
    expect(screen.getByTestId('script-area')).toBeInTheDocument();
    expect(screen.getByLabelText('Characters')).toBeInTheDocument();
    expect(screen.getByLabelText('Pages')).toBeInTheDocument();
    // Running stays enabled (non-destructive viewing).
    expect(screen.getByTestId('go-button')).toBeInTheDocument();

    // Every mutation affordance is absent.
    expect(screen.queryByTestId('palette')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-character')).not.toBeInTheDocument();
    expect(screen.queryByTestId('add-page')).not.toBeInTheDocument();
    expect(screen.queryByTestId('scene-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('trash-bin')).not.toBeInTheDocument();
    expect(screen.queryByTestId('undo')).not.toBeInTheDocument();
    expect(screen.queryByTestId('redo')).not.toBeInTheDocument();
    // Selecting a character/page (read-only navigation) stays available.
    const page0 = screen.queryByTestId('page-thumb-0');
    if (page0) fireEvent.click(page0); // never throws / mutates
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
