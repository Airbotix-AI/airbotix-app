// @vitest-environment jsdom

// The Workspace ("✨ AI Studio") auto-resumes the kid's most recent session on
// entry. The bug this locks: when that session was a MUSIC one, the D-MS7
// bridge (music session → /learn/music/:id) fired on the AUTO-selected session
// too, hijacking the whole AI Studio entry onto an old song. Auto-select must
// skip music sessions; the bridge stays for a session the kid explicitly picks.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { WorkspacePage } from './WorkspacePage';

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'kid', sub: 'kid_1', family_id: 'fam_1' } }),
}));

// Heavy panes are irrelevant to the resume/redirect seam under test.
vi.mock('./ChatPane', () => ({ ChatPane: () => <div data-testid="chat-pane" /> }));
vi.mock('./CodePane', () => ({ CodePane: () => null }));
vi.mock('./PreviewPane', () => ({ PreviewPane: () => null }));
vi.mock('./ImportTrackPicker', () => ({ ImportTrackPicker: () => null }));

const MUSIC_SESSION = {
  id: 's_music',
  studio: 'music',
  title: 'Star Puppy Jam',
  created_at: '2026-07-13T10:00:00Z',
};
const CHAT_SESSION = {
  id: 's_chat',
  studio: 'chat',
  title: 'A space story',
  created_at: '2026-07-12T10:00:00Z',
};

vi.mock('@/lib/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...mod,
    api: vi.fn((path: string) => {
      if (path === '/kids/kid_1/learning-sessions') {
        // Most recent FIRST — the music one.
        return Promise.resolve([MUSIC_SESSION, CHAT_SESSION]);
      }
      if (/\/messages$/.test(path)) return Promise.resolve([]);
      if (/\/wallet$/.test(path)) return Promise.resolve({ stars_balance: 10 });
      return Promise.resolve({});
    }),
  };
});

function mount() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/learn/workspace']}>
        <Routes>
          <Route path="/learn/workspace" element={<WorkspacePage />} />
          <Route path="/learn/music/:sessionId" element={<div data-testid="music-stage-route" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe('WorkspacePage session auto-resume', () => {
  it('skips music sessions on auto-select — opening the AI Studio never bounces to /learn/music', async () => {
    mount();
    // The chat session (not the newer music one) becomes active → chat shell renders.
    await waitFor(() => expect(screen.getByTestId('chat-pane')).toBeInTheDocument());
    expect(screen.queryByTestId('music-stage-route')).not.toBeInTheDocument();
  });
});
