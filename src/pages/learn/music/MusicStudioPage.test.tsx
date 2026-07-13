// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as apiMod from '@/lib/api';
import { MusicStudioPage } from './MusicStudioPage';

// The stage itself is covered by MusicStagePane.test — here we assert the SURFACE:
// session bootstrap, the URL it lands on, and that the kid can get out (the Learn
// nav bar is hidden on an immersive route, so the page owns the exit).
vi.mock('../workspace/stage/MusicStagePane', () => ({
  MusicStagePane: ({ sessionId, onExit }: { sessionId: string; onExit: () => void }) => (
    <div data-testid="stage" data-session={sessionId}>
      <button type="button" onClick={onExit} data-testid="stage-exit">
        exit
      </button>
    </div>
  ),
}));
vi.mock('../workspace/ImportTrackPicker', () => ({ ImportTrackPicker: () => null }));
vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid_1', family_id: 'fam_1' } }),
}));

function mount(path = '/learn/music') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/learn" element={<div data-testid="learn-home" />} />
          <Route path="/learn/music" element={<MusicStudioPage />} />
          <Route path="/learn/music/:sessionId" element={<MusicStudioPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.restoreAllMocks());
afterEach(cleanup);

describe('MusicStudioPage', () => {
  it('opens a music session and puts it in the URL, so a refresh returns to the same song', async () => {
    const spy = vi.spyOn(apiMod, 'api').mockImplementation((path: string) => {
      if (path === '/learning-sessions') return Promise.resolve({ id: 's_new' });
      return Promise.resolve([]);
    });
    mount();

    await waitFor(() => expect(screen.getByTestId('stage')).toBeInTheDocument());
    expect(spy).toHaveBeenCalledWith('/learning-sessions', {
      method: 'POST',
      body: { studio: 'music' },
    });
    // Redirected onto the session URL — a blank /learn/music would otherwise hand
    // the kid a fresh empty stage every reload.
    expect(screen.getByTestId('stage')).toHaveAttribute('data-session', 's_new');
  });

  it('does not mint a session when the URL already names one', async () => {
    const spy = vi.spyOn(apiMod, 'api').mockResolvedValue([]);
    mount('/learn/music/s_existing');

    await waitFor(() => expect(screen.getByTestId('stage')).toBeInTheDocument());
    expect(screen.getByTestId('stage')).toHaveAttribute('data-session', 's_existing');
    expect(spy).not.toHaveBeenCalledWith('/learning-sessions', expect.anything());
  });

  it('gives the kid a way out — the nav bar is hidden on this surface', async () => {
    vi.spyOn(apiMod, 'api').mockResolvedValue([]);
    const { container } = mount('/learn/music/s1');

    await waitFor(() => expect(screen.getByTestId('stage')).toBeInTheDocument());
    screen.getByTestId('stage-exit').click();
    await waitFor(() => expect(screen.getByTestId('learn-home')).toBeInTheDocument());
    expect(container).toBeTruthy();
  });
});
