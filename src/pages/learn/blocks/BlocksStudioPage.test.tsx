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

import { saveBlocksProject } from './blocksApi';
import { blankProject } from './blocksModel';
import { BlocksStudioPage } from './BlocksStudioPage';
import { useBlocksStore } from './blocksStore';

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
});

async function renderStudio() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <BlocksStudioPage projectId="p1" />
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
