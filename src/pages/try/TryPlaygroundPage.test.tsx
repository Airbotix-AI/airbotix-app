// @vitest-environment jsdom
// /try/playground (try-demo-mode-prd §3 v2 / acceptance 1): the demo starts on
// the REAL landing phase with the prompt pre-filled + locked, the step-1 card
// sits beside the input and is NOT skippable, and "Create the game" drives the
// real create flow — with zero network and no auth token.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/auth/authStore';
import { PLAYGROUND_DEMO_SCRIPT } from './demoScript.playground';
import { TryPlaygroundPage } from './TryPlaygroundPage';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  // A DATA router (createMemoryRouter): PlaygroundApp uses useBlocker.
  const router = createMemoryRouter([{ path: '/', element: <TryPlaygroundPage /> }]);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('TryPlaygroundPage', () => {
  it('starts on the REAL landing phase with the prompt pre-filled and locked', () => {
    renderPage();
    // The real landing screen is mounted (not a rebuilt lookalike, no backdrop).
    expect(screen.getByTestId('studio-root')).toBeInTheDocument();
    expect(screen.queryByTestId('demo-tour-backdrop')).not.toBeInTheDocument();
    const input = screen.getByLabelText('Describe a game') as HTMLTextAreaElement;
    expect(input.value).toBe(PLAYGROUND_DEMO_SCRIPT.lockedPrompt);
    expect(input).toHaveAttribute('readonly');
    // Inputs that could change the locked prompt are hidden in the demo.
    expect(screen.queryByTestId('starter-chip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('voice-input')).not.toBeInTheDocument();
    expect(screen.getByTestId('demo-banner')).toBeInTheDocument();
  });

  it('only the tour card creates the game — the landing submit + Enter are inert', () => {
    renderPage();
    // The landing's own send button is disabled in demo mode…
    expect(screen.getByLabelText('Build game')).toBeDisabled();
    // …and Enter in the (read-only) prompt box must not create either: the
    // studio stays on the landing phase.
    fireEvent.keyDown(screen.getByLabelText('Describe a game'), { key: 'Enter' });
    expect(screen.queryByTestId('generating-screen')).not.toBeInTheDocument();
    expect(screen.getByTestId('tour-next')).toHaveTextContent('Create the game');
  });

  it('step 1 sits beside the input, is not skippable, and reads "Create the game"', () => {
    renderPage();
    expect(screen.getByTestId('tour-title')).toHaveTextContent('Every game starts with a sentence');
    expect(screen.getByTestId('tour-card')).toHaveAttribute('data-placement', 'beside-input');
    expect(screen.queryByTestId('tour-skip')).not.toBeInTheDocument(); // §3 step 1
    expect(screen.getByTestId('tour-next')).toHaveTextContent('Create the game');
  });

  it('"Create the game" drives the REAL create flow — no token, no network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(useAuthStore.getState().tokens.kid).toBeNull(); // clean session
    renderPage();
    fireEvent.click(screen.getByTestId('tour-next')); // Create the game
    // The real PlaygroundApp moved into the generating phase, echoing the
    // locked prompt (it also appears in the landing textarea, so scope the
    // check to the studio screen).
    const generating = await screen.findByTestId('generating-screen');
    expect(
      within(generating).getByText(/Make a fruit-catcher game where I move a basket/),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
