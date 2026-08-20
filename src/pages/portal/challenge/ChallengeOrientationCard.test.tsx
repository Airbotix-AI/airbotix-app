// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'user', family_id: 'fam-1' } }),
}));

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (...args: unknown[]) => apiMock(...args) }));

import { ChallengeOrientationCard } from './ChallengeOrientationCard';

const VIDEO = 'https://app.airbotix.ai/challenge-media/creative-challenge-how-it-works-v1.mp4';

const EDITION: {
  id: string;
  slug: string;
  name: string;
  status: string;
  submission_open: string;
  submission_close: string;
  // Widened on purpose — a case below drops the video, and inference from the
  // literal would pin these to `string`.
  orientation_video_url: string | null;
  orientation_video_poster: string | null;
} = {
  id: 'ed_1',
  slug: 'creative-code-challenge-2026-junior',
  name: 'Creative Code Challenge — 2026 Junior',
  status: 'registration_open',
  submission_open: '2026-08-23T14:00:00.000Z',
  submission_close: '2026-08-31T13:59:59.000Z',
  orientation_video_url: VIDEO,
  orientation_video_poster: null,
};

type Entry = {
  kid_id: string;
  kid_nickname: string;
  entry_id: string;
  status: string;
  progress_state: string;
  designated_project_id: string | null;
  at_risk: boolean;
};

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    kid_id: 'kid-1',
    kid_nickname: 'Mia',
    entry_id: 'e1',
    status: 'registration_confirmed',
    progress_state: 'entered',
    designated_project_id: null,
    at_risk: false,
    ...overrides,
  };
}

function wire(entries: Entry[], edition = EDITION, reject = false) {
  apiMock.mockImplementation((path: string) => {
    if (String(path).includes('/family-entries')) {
      return reject ? Promise.reject(new Error('boom')) : Promise.resolve({ edition, entries });
    }
    return Promise.reject(new Error(`unexpected ${String(path)}`));
  });
}

function renderCard() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChallengeOrientationCard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Block bodies on purpose: `mockReset()` returns the mock, and an arrow that
// returns a FUNCTION is registered by vitest as a cleanup hook and then called
// — which shows up as a mystery zero-argument `api()` call at teardown.
beforeEach(() => {
  apiMock.mockReset();
});
afterEach(() => {
  cleanup();
});

describe('ChallengeOrientationCard — who still needs the walkthrough (§13)', () => {
  it('shows for a PAID child who has not started, and names them', async () => {
    wire([entry({ progress_state: 'entered' })]);
    renderCard();

    expect(await screen.findByTestId('challenge-orientation-card')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-orientation-video')).toBeInTheDocument();
    expect(screen.getByText(/Mia hasn’t started building yet/)).toBeInTheDocument();
  });

  // The whole point of gating on progress rather than on a dismissal: it goes
  // away by itself the moment the child actually starts.
  it.each([['oriented'], ['building'], ['submitted']])(
    'disappears once the child is %s',
    async (progress_state) => {
      wire([entry({ progress_state })]);
      const { container } = renderCard();

      await waitFor(() => expect(apiMock).toHaveBeenCalled());
      await waitFor(() => expect(container).toBeEmptyDOMElement());
    },
  );

  it('does not show for an abandoned checkout — an unpaid entry is not an entrant', async () => {
    wire([entry({ status: 'pending_payment', progress_state: 'entered' })]);
    const { container } = renderCard();

    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('shows nothing for a family that never entered', async () => {
    wire([]);
    const { container } = renderCard();

    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('still shows while ONE of several children has not started', async () => {
    wire([
      entry({ kid_id: 'kid-1', kid_nickname: 'Mia', progress_state: 'building' }),
      entry({ kid_id: 'kid-2', kid_nickname: 'Max', entry_id: 'e2', progress_state: 'entered' }),
    ]);
    renderCard();

    expect(await screen.findByTestId('challenge-orientation-card')).toBeInTheDocument();
    expect(screen.getByText(/Max hasn’t started building yet/)).toBeInTheDocument();
  });

  it('names nobody when several children are still to start', async () => {
    // Naming one would be wrong about the other.
    wire([
      entry({ kid_id: 'kid-1', kid_nickname: 'Mia' }),
      entry({ kid_id: 'kid-2', kid_nickname: 'Max', entry_id: 'e2' }),
    ]);
    renderCard();

    expect(await screen.findByTestId('challenge-orientation-card')).toBeInTheDocument();
    expect(screen.getByText(/Nobody has started building yet/)).toBeInTheDocument();
    expect(screen.queryByText(/Mia/)).not.toBeInTheDocument();
  });

  it('renders nothing when the edition has no video, even for a stuck entrant', async () => {
    wire([entry()], { ...EDITION, orientation_video_url: null });
    const { container } = renderCard();

    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('stays silent when the read fails — never appears because a request errored', async () => {
    wire([], EDITION, true);
    const { container } = renderCard();

    await waitFor(() => expect(apiMock).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('links onward to the challenge, not the wallet', async () => {
    wire([entry()]);
    renderCard();

    const link = await screen.findByRole('link', { name: /open the challenge/i });
    expect(link).toHaveAttribute('href', '/portal/challenge/creative-code-challenge-2026-junior');
  });
});
