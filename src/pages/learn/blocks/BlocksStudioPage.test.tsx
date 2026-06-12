// @vitest-environment jsdom
// Zone label chips (learn-blocks-studio-prd.md clarity pass): every studio area
// wears an emoji-first name tag for pre-readers — 🎬 Stage, 🐱 Characters,
// 📖 Pages, 🧩 Blocks, ✨ What they do. Chips are decoration only (aria-hidden;
// the zones carry matching aria-labels) and disappear in present mode.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { blankProject } from './blocksModel';
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
