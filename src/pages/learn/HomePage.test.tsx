// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, useMeMock } = vi.hoisted(() => ({ api: vi.fn(), useMeMock: vi.fn() }));

vi.mock('@/lib/api', () => ({ api, ApiError: class extends Error {} }));
vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));

vi.mock('./WelcomeModal', () => ({ WelcomeModal: () => null }));

import { HomePage } from './HomePage';
import { CREATE_TOOLS } from './create/createTools';
import { SHOW_LESSONS_CATALOG } from '@/lib/features';

const SLUG = 'creative-code-challenge-2026-junior';

function entry(overrides: Record<string, unknown> = {}) {
  return {
    edition_id: 'ed_1',
    slug: SLUG,
    name: 'Creative Code Challenge — Junior',
    entry_id: 'entry_1',
    entry_status: 'registration_confirmed',
    progress_state: 'entered',
    designated_project_id: null,
    submission_open: '2026-08-24T12:00:00.000Z',
    submission_close: '2026-08-31T12:00:00.000Z',
    ...overrides,
  };
}

// The home page now reads `GET /challenges/mine`, so it needs a query client —
// it previously mounted in a bare MemoryRouter and the first `useQuery` would
// have thrown for the whole file.
function renderHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useMeMock.mockReturnValue({ data: { kind: 'kid', sub: 'kid-1', nickname: 'Mia' } });
  api.mockImplementation((path: string) =>
    path === '/challenges/mine' ? Promise.resolve([]) : Promise.resolve(undefined),
  );
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Learn home', () => {
  it('puts every live studio directly on the first screen', () => {
    renderHome();

    expect(screen.getByTestId('learn-home-character')).toHaveAttribute(
      'data-character',
      'lumi-welcome',
    );

    const expected = [
      ['story-blocks', 'Story Blocks', '/learn/create/blocks'],
      ['creative-code', 'Creative Code Studio', '/learn/playground/new'],
      ['art-studio', 'Art Studio', '/learn/create/image'],
      ['music-stage', 'Music Stage', '/learn/music'],
    ];
    for (const [id, name, href] of expected) {
      const card = screen.getByTestId(`home-${id}`);
      expect(card).toHaveAttribute('href', href);
      expect(card).toHaveTextContent(name);
    }
    expect(screen.getByTestId('home-studio-grid')).toHaveTextContent('Pick one and start making');
    expect(screen.getByRole('link', { name: 'All tools →' })).toHaveAttribute(
      'href',
      '/learn/create',
    );

    // Creative Code Studio jumps STRAIGHT to the game playground prompt (no
    // intermediate "pick a starting point" menu).
    expect(screen.getByTestId('home-creative-code')).toHaveAttribute(
      'href',
      '/learn/playground/new',
    );
    expect(screen.getByTestId('home-creative-code-character')).toHaveAttribute(
      'data-character',
      'airo',
    );
    // Its card says it builds websites too (D-WEB-11 — one entry, two kinds).
    expect(screen.getByTestId('home-creative-code')).toHaveTextContent(/website/i);

    // Website Studio has its OWN home tile as well, arming the explicit kind.
    expect(screen.getByTestId('home-website-studio')).toHaveAttribute(
      'href',
      '/learn/playground/new?kind=website',
    );
    expect(screen.getByTestId('home-website-studio-character')).toHaveAttribute(
      'data-character',
      'bix',
    );

    // The Guided-courses card follows the Lessons-catalog switch (features.ts):
    // hidden while the catalog is off, back with the same href when it's on.
    if (SHOW_LESSONS_CATALOG) {
      expect(screen.getByTestId('home-courses')).toHaveAttribute('href', '/learn/missions');
      expect(screen.getByTestId('home-courses-character')).toHaveAttribute(
        'data-character',
        'tuantuan-thinking',
      );
    } else {
      expect(screen.queryByTestId('home-courses')).not.toBeInTheDocument();
    }

    expect(screen.getByTestId('home-academy-character')).toHaveAttribute(
      'data-character',
      'tuantuan',
    );
    expect(screen.getByTestId('home-workspace-character')).toHaveAttribute(
      'data-character',
      'bix',
    );
    expect(screen.getByTestId('home-projects-character')).toHaveAttribute(
      'data-character',
      'airo-building',
    );
    expect(screen.getByTestId('home-class-wall-character')).toHaveAttribute(
      'data-character',
      'lumi-welcome',
    );
  });

  it('uses the canonical Story Blocks name in the studio catalogue', () => {
    const blocks = CREATE_TOOLS.find((tool) => tool.to === '/learn/create/blocks');
    expect(blocks?.title).toBe('Story Blocks');
    const creativeCode = CREATE_TOOLS.find((tool) => tool.to === '/learn/playground/new');
    expect(creativeCode?.title).toBe('Creative Code Studio');
  });
});

// The child's own way back into their challenge (entrant-onboarding-prd §10).
// Until this tile existed the only route in was a link a parent opened for them.
describe('Learn home — the challenge tile', () => {
  it('shows the entered child their challenge, named by the edition', async () => {
    api.mockImplementation((path: string) =>
      path === '/challenges/mine' ? Promise.resolve([entry()]) : Promise.resolve(undefined),
    );
    renderHome();

    const tile = await screen.findByTestId('home-my-challenge');
    expect(tile).toHaveAttribute('href', `/learn/challenge/${SLUG}/submit`);
    expect(tile).toHaveTextContent('Creative Code Challenge — Junior');
    expect(screen.getByTestId('home-challenge-character')).toHaveAttribute(
      'data-character',
      'bix-celebrating',
    );
  });

  it('is absent for a child with no entry', async () => {
    renderHome();
    await waitFor(() => expect(api).toHaveBeenCalledWith('/challenges/mine'));
    expect(screen.queryByTestId('home-my-challenge')).not.toBeInTheDocument();
  });

  // Walk-ins DO get an ephemeral family and wallet, so family absence is not the
  // discriminator — gating on that would have shipped a no-op.
  it('is absent for a walk-in kid, who is never asked at all', async () => {
    useMeMock.mockReturnValue({
      data: { kind: 'kid', sub: 'kid-1', nickname: 'Mia', is_ephemeral: true },
    });
    api.mockImplementation((path: string) =>
      path === '/challenges/mine' ? Promise.resolve([entry()]) : Promise.resolve(undefined),
    );
    renderHome();

    await screen.findByTestId('home-studio-grid');
    expect(screen.queryByTestId('home-my-challenge')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/challenges/mine');
  });

  // A child's home screen never carries an error card or a spinner for this.
  it('renders nothing at all when the read fails', async () => {
    api.mockImplementation((path: string) =>
      path === '/challenges/mine'
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(undefined),
    );
    renderHome();

    await waitFor(() => expect(api).toHaveBeenCalledWith('/challenges/mine'));
    expect(screen.queryByTestId('home-my-challenge')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The rest of the home is untouched.
    expect(screen.getByTestId('home-studio-grid')).toBeInTheDocument();
  });
});
