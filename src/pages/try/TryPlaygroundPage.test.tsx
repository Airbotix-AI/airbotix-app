// @vitest-environment jsdom
// /try/playground (try-demo-mode-prd §3 / acceptance 1): the intro card shows
// the locked-prompt story; "Start the demo" mounts the REAL PlaygroundApp,
// which opens straight into the build with zero network and no auth token.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/auth/authStore';
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
  it('shows the modal intro first — the studio is NOT mounted yet', () => {
    renderPage();
    expect(screen.getByTestId('demo-tour-backdrop')).toBeInTheDocument();
    expect(screen.getByTestId('tour-title')).toHaveTextContent('This is how a lesson starts');
    expect(screen.getByTestId('demo-banner')).toBeInTheDocument();
    expect(screen.queryByTestId('generating-screen')).not.toBeInTheDocument();
  });

  it('Start mounts the REAL studio building the locked prompt — no token, no network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    expect(useAuthStore.getState().tokens.kid).toBeNull(); // clean session
    renderPage();
    fireEvent.click(screen.getByTestId('tour-next')); // ▶ Start the demo
    // The real PlaygroundApp opened straight into the generating phase, echoing
    // the locked prompt (no landing screen, no editable prompt box). The prompt
    // also appears in the tour copy, so scope the check to the studio screen.
    const generating = await screen.findByTestId('generating-screen');
    expect(
      within(generating).getByText(/Make a fruit-catcher game where I move a basket/),
    ).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
