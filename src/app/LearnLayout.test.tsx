// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthPrincipal } from '@/auth/types';

import { isRestrictedForWalkIn, LearnLayout } from './LearnLayout';

vi.mock('./LearnTopBar', () => ({ LearnTopBar: () => <nav data-testid="learn-nav" /> }));
vi.mock('@/components/NudgeBanner', () => ({ NudgeBanner: () => null }));
// Mutable per-test principal: default is an ordinary (claimed / family) kid.
let mePrincipal: AuthPrincipal | undefined;
vi.mock('@/auth/useAuth', () => ({
  useKidToken: () => 'tok',
  useMe: () => ({ data: mePrincipal }),
}));
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
            <Route path="/learn/classroom" element={<div data-testid="classroom" />} />
            <Route path="/learn/*" element={<div data-testid="page" />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** The centered reading column every ordinary Learn page sits in. */
const readingColumn = (c: HTMLElement) => c.querySelector('.max-w-5xl');

afterEach(() => {
  mePrincipal = undefined;
  cleanup();
});

const walkInKid: AuthPrincipal = {
  kind: 'kid',
  sub: 'kid_w',
  nickname: 'Zoe',
  family_id: 'fam_eph',
  is_ephemeral: true,
  claim_code: 'ABCDEFGHJ3',
};

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
  it.each(['/learn/music', '/learn/music/s1', '/learn/blocks/p1', '/learn/create/image'])(
    'gives the immersive surface %s the whole viewport — no nav, no reading column',
    (path) => {
      const { container, queryByTestId } = mount(path);
      expect(queryByTestId('learn-nav')).toBeNull();
      expect(readingColumn(container)).toBeNull();
    },
  );

  // The bug this locks: immersive <main> was h-full (100% of the layout column),
  // so anything rendering above it — the NudgeBanner deliberately surfaces over
  // studios — pushed the studio down and clipped its bottom bar off-screen by
  // exactly the banner height. flex-1 hands the studio the space actually left.
  it('sizes the immersive main with flex-1 so a banner above shrinks the studio instead of clipping it', () => {
    const { container } = mount('/learn/music/s1');
    const main = container.querySelector('main');
    expect(main).toHaveClass('flex-1', 'min-h-0', 'overflow-hidden');
    expect(main).not.toHaveClass('h-full');
  });

  // OS fullscreen is a Blocks-only behaviour (tablet-first). The Music Stage is
  // immersive (no nav, no page scroll) but must stay a normal browser page —
  // a desktop kid composing a song shouldn't have their browser hijacked into
  // fullscreen (user decision).
  // Walk-in (unclaimed) workshop kids only see their class + kid code
  // (auth-system-prd §5.2): catalog surfaces bounce to the classroom; deep
  // working routes stay open so nothing in the workshop itself is blocked.
  describe('walk-in restriction', () => {
    it.each(['/learn', '/learn/projects', '/learn/create', '/learn/workspace', '/learn/missions'])(
      'bounces a walk-in kid from %s to the classroom',
      (path) => {
        mePrincipal = walkInKid;
        const { getByTestId, queryByTestId } = mount(path);
        expect(getByTestId('classroom')).toBeInTheDocument();
        expect(queryByTestId('page')).toBeNull();
      },
    );

    it.each(['/learn/playground/p1', '/learn/blocks/p1', '/learn/projects/p1', '/learn/profile'])(
      'keeps the deep working route %s open for a walk-in kid',
      (path) => {
        mePrincipal = walkInKid;
        const { queryByTestId } = mount(path);
        expect(queryByTestId('classroom')).toBeNull();
      },
    );

    it('does not restrict an ordinary (claimed) kid', () => {
      mePrincipal = { ...walkInKid, is_ephemeral: false, claim_code: undefined };
      const { getByTestId } = mount('/learn/projects');
      expect(getByTestId('page')).toBeInTheDocument();
    });

    it('isRestrictedForWalkIn pins the exact route policy', () => {
      // restricted catalogs
      for (const p of [
        '/learn',
        '/learn/projects',
        '/learn/projects/new',
        '/learn/missions',
        '/learn/create',
        '/learn/create/code',
        '/learn/workspace',
      ]) {
        expect(isRestrictedForWalkIn(p), p).toBe(true);
      }
      // open working routes
      for (const p of [
        '/learn/classroom',
        '/learn/classroom/c1',
        '/learn/profile',
        '/learn/projects/p1',
        '/learn/missions/m1',
        '/learn/playground/p1',
        '/learn/code/p1',
        '/learn/blocks/p1',
      ]) {
        expect(isRestrictedForWalkIn(p), p).toBe(false);
      }
    });
  });

  it('auto-enters OS fullscreen on first tap for Blocks but NEVER for the Music Stage', () => {
    const requestFullscreen = vi.fn(() => Promise.resolve());
    Object.defineProperty(document.documentElement, 'requestFullscreen', {
      configurable: true,
      value: requestFullscreen,
    });
    try {
      mount('/learn/music/s1');
      window.dispatchEvent(new Event('pointerdown'));
      expect(requestFullscreen).not.toHaveBeenCalled();
      cleanup();

      mount('/learn/blocks/p1');
      window.dispatchEvent(new Event('pointerdown'));
      expect(requestFullscreen).toHaveBeenCalledTimes(1);
    } finally {
      delete (document.documentElement as { requestFullscreen?: unknown }).requestFullscreen;
    }
  });
});
