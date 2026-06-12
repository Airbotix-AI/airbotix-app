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
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// CI's jsdom (Node 20) has no Element.scrollTo — the reader calls the real one.
beforeAll(() => {
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
  }
});

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

describe('narrow pane: single-column reader with a Topics toggle', () => {
  function stubNarrow(width: number) {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        cb: ResizeObserverCallback;
        constructor(cb: ResizeObserverCallback) {
          this.cb = cb;
        }
        observe(el: Element) {
          Object.defineProperty(el, 'clientWidth', { configurable: true, value: width });
          this.cb([] as never, this as never);
        }
        disconnect() {}
        unobserve() {}
      },
    );
  }

  afterEach(() => vi.unstubAllGlobals());

  it('collapses below the threshold: nav hidden, ☰ Topics opens it, picking a doc returns', async () => {
    stubNarrow(300);
    renderPane();
    await screen.findByTestId('help-reader');
    // nav is hidden; the reader owns the full width
    expect(screen.getByTestId('help-pane').getAttribute('data-narrow')).toBe('true');
    const nav = () => screen.getByTestId('help-search-input').closest('nav')!;
    // (class assertions: jsdom loads no Tailwind stylesheet, so `hidden` is
    // the contract, not computed visibility)
    expect(nav().className).toContain('hidden');
    // open topics, pick a doc, back to the reader
    fireEvent.click(screen.getByTestId('help-topics-toggle'));
    expect(nav().className).toContain('w-full');
    expect(nav().className).not.toContain('hidden');
    const docLink = screen.getAllByTestId(/help-nav-doc-/)[0];
    fireEvent.click(docLink);
    expect(nav().className).toContain('hidden');
    expect(screen.getByTestId('help-reader')).toBeInTheDocument();
  });

  it('wide panes keep the two-column layout (no toggle)', async () => {
    stubNarrow(600);
    renderPane();
    await screen.findByTestId('help-reader');
    expect(screen.getByTestId('help-pane').getAttribute('data-narrow')).toBeNull();
    expect(screen.queryByTestId('help-topics-toggle')).not.toBeInTheDocument();
    expect(screen.getByTestId('help-search-input').closest('nav')!.className).toContain('w-48');
  });
});
