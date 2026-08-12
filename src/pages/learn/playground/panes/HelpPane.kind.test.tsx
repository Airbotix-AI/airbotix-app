// @vitest-environment jsdom
// Kind-aware Guide corpus (creative-code-studio-website-prd D-WEB-21): a website
// project loads the WEBSITE corpus (frontend/backend/database/data-sources/
// communication) via `loadHelpCorpus('website')`; a game project is UNCHANGED
// (`loadHelpCorpus('game')`). The pane never re-filters — it trusts the server's
// kind filter — so this asserts the fetch kind + that the returned pillars render.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type { HelpCorpus } from './help/helpTypes';

// CI's jsdom (Node 20) has no Element.scrollTo — the reader calls the real one.
beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
});

const { loadHelpCorpusMock } = vi.hoisted(() => ({ loadHelpCorpusMock: vi.fn() }));
vi.mock('./help/helpApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./help/helpApi')>();
  return { ...actual, loadHelpCorpus: loadHelpCorpusMock };
});

import { HelpPane } from './HelpPane';

const GAME_CORPUS: HelpCorpus = {
  pillars: [{ id: 'start', kind: 'game', title: 'Start here', blurb: '', order: 1 }],
  docs: [
    {
      id: 'start/what-is-a-game',
      kind: 'game',
      pillar: 'start',
      order: 1,
      title: 'What a game is',
      tags: ['game'],
      blocks: [{ kind: 'para', text: 'A game is a loop.' }],
    },
  ],
};

const WEBSITE_CORPUS: HelpCorpus = {
  pillars: [
    { id: 'frontend', kind: 'website', title: 'Frontend pages', blurb: '', order: 1 },
    { id: 'backend', kind: 'website', title: 'Backend routes', blurb: '', order: 2 },
    { id: 'database', kind: 'website', title: 'The database', blurb: '', order: 3 },
    { id: 'communication', kind: 'website', title: 'How they talk', blurb: '', order: 4 },
  ],
  docs: [
    {
      id: 'frontend/what-is-a-website',
      kind: 'website',
      pillar: 'frontend',
      order: 1,
      title: 'What a website is',
      tags: ['website', 'html'],
      blocks: [{ kind: 'para', text: 'A website is pages made of HTML, CSS and JS.' }],
    },
    {
      id: 'communication/fetch-loop',
      kind: 'website',
      pillar: 'communication',
      order: 1,
      title: 'How the pieces talk',
      tags: ['fetch', 'api'],
      blocks: [{ kind: 'para', text: 'The page fetches /api, the server answers.' }],
    },
  ],
};

afterEach(() => {
  cleanup();
  loadHelpCorpusMock.mockReset();
});

function renderPane(kind: 'game' | 'website') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <HelpPane mode="lite" kind={kind} />
    </QueryClientProvider>,
  );
}

describe('HelpPane kind-aware corpus (D-WEB-21)', () => {
  it('a website project fetches the WEBSITE corpus and renders website pillars', async () => {
    loadHelpCorpusMock.mockResolvedValue(WEBSITE_CORPUS);
    renderPane('website');

    expect(await screen.findByTestId('help-nav-frontend')).toHaveTextContent('Frontend pages');
    expect(screen.getByTestId('help-nav-communication')).toHaveTextContent('How they talk');
    // The doc buttons for the website corpus are present.
    expect(screen.getByTestId('help-nav-doc-frontend/what-is-a-website')).toBeInTheDocument();
    // Fetched with the website kind — the pane trusts the server filter.
    expect(loadHelpCorpusMock).toHaveBeenCalledWith('website');
    // The reader's fallback header reads "Website Guide" (no game doc selected).
    expect(screen.getByText('Website Guide')).toBeInTheDocument();
  });

  it('a game project fetches the GAME corpus (unchanged) and renders game pillars', async () => {
    loadHelpCorpusMock.mockResolvedValue(GAME_CORPUS);
    renderPane('game');

    expect(await screen.findByTestId('help-nav-start')).toHaveTextContent('Start here');
    expect(loadHelpCorpusMock).toHaveBeenCalledWith('game');
    expect(screen.queryByTestId('help-nav-frontend')).not.toBeInTheDocument();
  });

  it('defaults to the game corpus when no kind is given', async () => {
    loadHelpCorpusMock.mockResolvedValue(GAME_CORPUS);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <HelpPane mode="lite" />
      </QueryClientProvider>,
    );
    await screen.findByTestId('help-nav-start');
    expect(loadHelpCorpusMock).toHaveBeenCalledWith('game');
  });
});
