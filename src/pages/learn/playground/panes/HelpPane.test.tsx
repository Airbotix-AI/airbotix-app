// @vitest-environment jsdom
// Game Guide dark-mode compatibility: the pane's chrome is pg-* tokens (flipped
// by `data-theme` on the playground root), so the remaining dark-incompatible
// surface was UA-rendered chrome — native scrollbars. The pane's two scroll
// containers must use the themed `.pg-scroll` bar (the chat-log convention),
// and the theme token blocks must pin `color-scheme` so everything the UA
// paints (scrollbars, form-control internals) follows the active theme.

import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { setDemoHelpCorpus } from './help/helpApi';
import type { HelpCorpus } from './help/helpTypes';
import { HelpPane } from './HelpPane';

const CORPUS: HelpCorpus = {
  pillars: [{ id: 'engine', title: 'How games work', blurb: '' }],
  docs: [
    {
      id: 'engine/what-is-an-engine',
      pillar: 'engine',
      title: 'What is a game engine?',
      tags: ['engine'],
      blocks: [{ kind: 'para', text: 'A helper that does the hard parts.' }],
    },
  ],
};

afterEach(() => {
  cleanup();
  setDemoHelpCorpus(null);
});

function renderPane() {
  setDemoHelpCorpus(CORPUS); // offline corpus through the pane's real loader
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <HelpPane mode="lite" />
    </QueryClientProvider>,
  );
}

describe('HelpPane themed scrollbars (dark-mode compatibility)', () => {
  it('the nav and the reader scroll with the themed .pg-scroll bar', async () => {
    renderPane();
    expect(await screen.findByText('A helper that does the hard parts.')).toBeInTheDocument();
    const reader = screen.getByTestId('help-reader');
    expect(reader.className).toContain('pg-scroll');
    // The nav list is the scroll container wrapping the pillar groups.
    const nav = screen.getByTestId('help-nav-engine').closest('.overflow-y-auto');
    expect(nav?.className).toContain('pg-scroll');
  });
});

describe('playground theme tokens pin color-scheme', () => {
  // jsdom doesn't compute styles from stylesheets, so assert the token-block
  // contract at the source: each [data-theme] block declares its color-scheme
  // (light scrollbars inside the dark workspace = the bug this prevents).
  const css = readFileSync(join(__dirname, '../playground.css'), 'utf8');

  it.each([
    ['light', /\[data-theme='light'\]\s*\{[^}]*color-scheme:\s*light/],
    ['dark', /\[data-theme='dark'\]\s*\{[^}]*color-scheme:\s*dark/],
  ])('the %s theme block declares color-scheme', (_theme, pattern) => {
    expect(css).toMatch(pattern);
  });
});
