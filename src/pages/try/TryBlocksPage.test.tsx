// @vitest-environment jsdom
// /try/blocks (try-demo-mode-prd §4 / acceptance 1+4): the REAL BlocksStudioPage
// renders with the bundled story — no auth, no network, share hidden — under the
// demo banner + tour overlay.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/auth/authStore';
import { useBlocksTheme } from '../learn/blocks/blocksTheme';
import { TryBlocksPage } from './TryBlocksPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <TryBlocksPage />
    </MemoryRouter>,
  );
}

describe('TryBlocksPage', () => {
  it('renders the REAL studio with the bundled story — no token, no network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(useAuthStore.getState().tokens.kid).toBeNull(); // clean session
    renderPage();

    // The real studio mounted with the demo story loaded.
    expect(await screen.findByTestId('blocks-studio')).toBeInTheDocument();
    expect(screen.getByText("Cat's Day Out")).toBeInTheDocument();
    expect(screen.getByTestId('go-button')).toBeInTheDocument();
    // All 3 story pages are on the pages rail.
    expect(screen.getByTestId('page-thumb-0')).toBeInTheDocument();
    expect(screen.getByTestId('page-thumb-2')).toBeInTheDocument();
    // Zero network: no /projects*, no /auth*, nothing.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('gates cloud share (D-DEMO-08) and shows the demo banner + tour', async () => {
    renderPage();
    await screen.findByTestId('blocks-studio');
    expect(screen.queryByTestId('share-link-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('demo-banner')).toHaveTextContent('Demo mode');
    expect(screen.getByTestId('demo-banner')).toHaveTextContent('Contact us');
    // Home exits to the marketing "Try it" page — a usable absolute URL in EVERY
    // environment (dev default = the marketing dev server, prod = airbotix.ai).
    expect(screen.getByTestId('demo-home')).toHaveAttribute(
      'href',
      expect.stringMatching(/^https?:\/\/.+\/try$/),
    );
    expect(screen.getByTestId('demo-tour')).toBeInTheDocument();
    expect(screen.getByTestId('tour-title')).toHaveTextContent("Cat's Day Out — a story told in blocks");
  });

  it('feeds the studio theme to the tour overlay, live (the demo opens light)', async () => {
    renderPage();
    await screen.findByTestId('blocks-studio');
    // installBlocksDemo forces the light open; the studio's own toggle still
    // works, and the overlay re-picks the scrim from the LIVE store.
    expect(screen.getByTestId('demo-tour')).not.toHaveAttribute('data-dark-ui');
    act(() => useBlocksTheme.setState({ theme: 'dark' }));
    expect(screen.getByTestId('demo-tour')).toHaveAttribute('data-dark-ui', 'true');
    act(() => useBlocksTheme.setState({ theme: 'light' }));
    expect(screen.getByTestId('demo-tour')).not.toHaveAttribute('data-dark-ui');
  });

  it('the tour steps through to free explore and can be skipped', async () => {
    renderPage();
    await screen.findByTestId('blocks-studio');
    fireEvent.click(screen.getByTestId('tour-next')); // start the tour
    expect(screen.getByTestId('tour-title')).toHaveTextContent('Press ▶ Go!');
    fireEvent.click(screen.getByTestId('tour-skip')); // skip → overlay gone
    expect(screen.queryByTestId('demo-tour')).not.toBeInTheDocument();
    // The studio stays fully interactive after the tour.
    expect(screen.getByTestId('go-button')).toBeEnabled();
  });
});

describe('Press-Go card: the run owns the spotlight (user Go or tour Next)', () => {
  it('Next presses the REAL Go, spotlights the stage while playing, advances when done', async () => {
    renderPage();
    await screen.findByTestId('blocks-studio');
    fireEvent.click(screen.getByTestId('tour-next')); // intro → Press ▶ Go!
    expect(screen.getByTestId('tour-title')).toHaveTextContent('Press ▶ Go!');
    fireEvent.click(screen.getByTestId('tour-next')); // presses the real Go
    // while the story plays: busy Next with the play label
    await vi.waitFor(() => expect(screen.getByTestId('tour-next')).toBeDisabled());
    expect(screen.getByTestId('tour-next')).toHaveTextContent('Playing…');
    // the real interpreter finishes page 1 → the tour advances by itself
    await vi.waitFor(
      () => expect(screen.getByTestId('tour-title')).toHaveTextContent('Tap a character'),
      { timeout: 15_000 },
    );
  }, 20_000);

  it("the user's OWN Go press drives the same flow", async () => {
    renderPage();
    await screen.findByTestId('blocks-studio');
    fireEvent.click(screen.getByTestId('tour-next')); // → Press ▶ Go!
    fireEvent.click(screen.getByTestId('go-button')); // user presses the real button
    await vi.waitFor(() => expect(screen.getByTestId('tour-next')).toBeDisabled());
    await vi.waitFor(
      () => expect(screen.getByTestId('tour-title')).toHaveTextContent('Tap a character'),
      { timeout: 15_000 },
    );
  }, 20_000);
});
