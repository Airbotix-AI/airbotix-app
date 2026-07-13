// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LearnLayout } from './LearnLayout';

vi.mock('./LearnTopBar', () => ({ LearnTopBar: () => <nav data-testid="learn-nav" /> }));
vi.mock('@/components/NudgeBanner', () => ({ NudgeBanner: () => null }));
vi.mock('@/auth/useAuth', () => ({ useKidToken: () => 'tok' }));
vi.mock('@/lib/ws', () => ({
  sendWsEvent: vi.fn(),
  reEmitFocus: vi.fn(),
  onWsEvent: vi.fn(() => () => {}),
}));

function mount(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<LearnLayout />}>
            <Route path="/learn/*" element={<div data-testid="page" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The centered reading column every ordinary Learn page sits in. */
const readingColumn = (c: HTMLElement) => c.querySelector('.max-w-5xl');

afterEach(cleanup);

describe('LearnLayout', () => {
  it('wraps an ordinary page in the centered reading column, with the nav', () => {
    const { container, getByTestId } = mount('/learn/projects');
    expect(getByTestId('learn-nav')).toBeInTheDocument();
    expect(readingColumn(container)).toBeTruthy();
  });

  // The bug this locks: /learn/music was listed as immersive but not as fluid, so
  // the nav hid and page scroll locked while the "fullscreen" stage stayed
  // letterboxed inside the max-w-5xl reading column. Immersive must imply
  // full-bleed — there is no surface that wants both.
  it.each(['/learn/music', '/learn/music/s1', '/learn/blocks/p1'])(
    'gives the immersive surface %s the whole viewport — no nav, no reading column',
    (path) => {
      const { container, queryByTestId } = mount(path);
      expect(queryByTestId('learn-nav')).toBeNull();
      expect(readingColumn(container)).toBeNull();
    },
  );
});
