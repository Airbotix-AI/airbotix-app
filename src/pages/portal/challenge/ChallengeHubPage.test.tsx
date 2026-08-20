// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const { parentKidLogin, openKidPageInNewTab } = vi.hoisted(() => ({
  parentKidLogin: vi.fn(),
  openKidPageInNewTab: vi.fn(),
}));

vi.mock('@/auth/useAuth', () => ({
  useMe: () => ({ data: { kind: 'user', family_id: 'fam-1' } }),
  useParentKidLogin: () => parentKidLogin,
}));

vi.mock('@/auth/openKidPage', () => ({ openKidPageInNewTab }));

const apiMock = vi.fn();
vi.mock('@/lib/api', () => ({ api: (path: string) => apiMock(path) }));

import { ChallengeHubPage } from './ChallengeHubPage';
import { CHALLENGE_PORTAL_PATH } from '@/lib/challenge';

const SLUG = 'creative-code-challenge-2026-junior';

const EDITION = {
  id: 'ed_1',
  slug: SLUG,
  name: 'Creative Code Challenge — 2026 Junior',
  age_group: 'junior_8_12',
  entry_fee_cents: 900,
  status: 'registration_open',
  registration_open: true,
  submission_open: '2026-08-23T14:00:00.000Z',
  submission_close: '2026-08-31T13:59:59.000Z',
  results_at: '2026-09-14T10:00:00.000Z',
  orientation_video_url:
    'https://app.airbotix.ai/challenge-media/creative-challenge-how-it-works-v1.mp4',
  orientation_video_poster: null,
};

const KIDS = [
  { id: 'kid-1', nickname: 'Mia', age: 9 },
  { id: 'kid-2', nickname: 'Max', age: 11 },
  { id: 'kid-3', nickname: 'Pip', age: 8 },
];

/** kid-1 confirmed, kid-2 mid-payment, kid-3 never started. */
const RUBRIC = {
  version: '1.0',
  total_points: 100,
  dimensions: [
    {
      key: 'original_idea',
      label: 'Original idea and creative decisions',
      max_points: 25,
      description: 'How original the concept is.',
      constraints: [],
    },
    {
      key: 'pitch',
      label: 'English Project Pitch',
      max_points: 15,
      description: 'How clearly the child explains, in English, what they built.',
      constraints: ['Do NOT award or deduct marks for accent or pronunciation.'],
    },
  ],
};

function wire({
  failKid,
  failRubric,
  familyEntries,
}: {
  failKid?: string;
  failRubric?: boolean;
  /** Progress rows behind the walkthrough's prominence. Default: none. */
  familyEntries?: Record<string, unknown>[];
} = {}) {
  apiMock.mockImplementation((path: string) => {
    if (path === '/challenges/rubric') {
      return failRubric ? Promise.reject(new Error('boom')) : Promise.resolve(RUBRIC);
    }
    if (path.includes('/family-entries')) {
      return Promise.resolve({ edition: EDITION, entries: familyEntries ?? [] });
    }
    if (path === '/families/fam-1/kids') return Promise.resolve(KIDS);
    const match = /kid_id=([^&]+)/.exec(path);
    const kidId = match ? decodeURIComponent(match[1]) : null;
    if (kidId && kidId === failKid) return Promise.reject(new Error('boom'));
    const entry =
      kidId === 'kid-1'
        ? { id: 'e1', status: 'registration_confirmed', stars_granted: 500 }
        : kidId === 'kid-2'
          ? { id: 'e2', status: 'pending_payment', stars_granted: 0 }
          : null;
    return Promise.resolve({ edition: EDITION, kid_id: kidId, entry });
  });
}

function renderHub() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ChallengeHubPage slug={SLUG} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMock.mockReset();
  parentKidLogin.mockReset();
  openKidPageInNewTab.mockReset().mockResolvedValue(undefined);
});
afterEach(() => cleanup());

describe('ChallengeHubPage — who in the family is entered', () => {
  it('shows registration open when the deadline flag is open even if ops status is still draft', async () => {
    wire();
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/challenges/rubric') return RUBRIC;
      if (path.includes('/family-entries')) {
        return { edition: { ...EDITION, status: 'draft' }, entries: [] };
      }
      if (path === '/families/fam-1/kids') return KIDS;
      return { edition: { ...EDITION, status: 'draft' }, kid_id: null, entry: null };
    });
    renderHub();

    const current = await screen.findByTestId('challenge-hub-current-stage');
    expect(current).toHaveTextContent('Registration open');
    expect(current).not.toHaveTextContent('Coming soon');
    expect(screen.getByTestId('challenge-timeline-register')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.queryByTestId('challenge-hub-closed')).not.toBeInTheDocument();
  });

  it('shows every child with their own standing, without the parent selecting anyone', async () => {
    // The whole reason this page exists: the register page opened on ONE child
    // chosen from a picker, so a family's standing could only be discovered by
    // switching between children one at a time.
    wire();
    renderHub();

    expect(
      await screen.findByTestId('challenge-hub-status-kid-1', undefined, { timeout: 5_000 }),
    ).toHaveTextContent('Entered');
    expect(screen.getByTestId('challenge-hub-status-kid-2')).toHaveTextContent(
      'Started — not paid yet',
    );
    expect(screen.getByTestId('challenge-hub-status-kid-3')).toHaveTextContent('Not entered');
  });

  it('registers children who are not entered and opens the entered child’s challenge', async () => {
    wire();
    renderHub();

    expect(await screen.findByTestId('challenge-hub-status-kid-1')).toHaveTextContent('Entered');
    const action = screen.getByTestId('challenge-hub-action-kid-3');
    expect(action).toHaveAttribute('href', `/portal/challenge/${SLUG}/register?kid_id=kid-3`);
    expect(action).toHaveTextContent('Register this child');
    expect(screen.getByTestId('challenge-hub-action-kid-1')).toHaveTextContent(
      'Open Mia’s challenge page',
    );
    expect(screen.getByTestId('challenge-hub-action-kid-1')).not.toHaveAttribute('href');
    expect(screen.getByTestId('challenge-hub-action-kid-2')).toHaveTextContent(
      'Finish registering',
    );
  });

  it('creates the selected kid session and opens that kid’s submit page', async () => {
    wire();
    renderHub();

    expect(await screen.findByTestId('challenge-hub-status-kid-1')).toHaveTextContent('Entered');
    fireEvent.click(screen.getByTestId('challenge-hub-action-kid-1'));

    await waitFor(() =>
      expect(openKidPageInNewTab).toHaveBeenCalledWith(
        parentKidLogin,
        'kid-1',
        expect.any(Function),
        `/learn/challenge/${SLUG}/submit`,
      ),
    );
  });

  it('never reports a failed lookup as "not entered"', async () => {
    // Telling a parent their PAID child has no entry is worse than admitting we
    // could not check — one is a false fact, the other is a retry.
    wire({ failKid: 'kid-1' });
    renderHub();

    await waitFor(() =>
      expect(screen.getByTestId('challenge-hub-status-kid-1')).toHaveTextContent(
        'Could not check this child’s entry',
      ),
    );
    expect(screen.getByTestId('challenge-hub-status-kid-1')).not.toHaveTextContent('Not entered');
  });
});

describe('ChallengeHubPage — the guidance a first-time family needs', () => {
  it('introduces the competition before asking the parent to act', async () => {
    wire();
    renderHub();

    const overview = await screen.findByTestId('challenge-hub-overview');
    expect(overview).toHaveTextContent('Online');
    expect(overview).toHaveTextContent('1 project');
    expect(overview).toHaveTextContent('60–90 sec');
    expect(overview).toHaveTextContent('100 points');
    expect(
      await screen.findByRole('heading', { name: /Creative Code Challenge — 2026 Junior/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/online creative coding competition for ages 8–14/i),
    ).toBeInTheDocument();
  });

  it('shows the current stage and a dated end-to-end timeline', async () => {
    wire();
    renderHub();

    const current = await screen.findByTestId('challenge-hub-current-stage');
    expect(current).toHaveTextContent('Your family is in');
    expect(current).toHaveTextContent(/start building/i);

    const timeline = screen.getByTestId('challenge-hub-timeline');
    expect(timeline.querySelectorAll(':scope > li')).toHaveLength(4);
    expect(screen.getByTestId('challenge-timeline-register')).toHaveAttribute(
      'aria-current',
      'step',
    );
    expect(screen.getByTestId('challenge-timeline-submit')).toHaveTextContent(
      '24 August 2026 — 31 August 2026',
    );
    expect(screen.getByTestId('challenge-timeline-results')).toHaveTextContent('14 September 2026');
  });

  it('answers "what now" with ordered steps and what gets submitted', async () => {
    // A parent who paid the entry fee previously landed on a card whose only action was
    // "View wallet". These two lists are the answer to what they build and hand in.
    wire();
    renderHub();

    const steps = await screen.findByTestId('challenge-hub-steps');
    expect(steps.querySelectorAll('li').length).toBeGreaterThanOrEqual(4);
    expect(steps).toHaveTextContent(/start building today/i);

    const items = screen.getByTestId('challenge-hub-submission-items');
    expect(items).toHaveTextContent(/60–90 second pitch video/);
    expect(items).toHaveTextContent(/evidence of one change/i);
  });

  it('states the English-fairness and declined-media rules where families see them', async () => {
    // These are commitments to children, not judge-only trivia.
    wire();
    renderHub();

    const notes = await screen.findByTestId('challenge-hub-judging-notes');
    expect(notes).toHaveTextContent(/never on accent, vocabulary, or the language spoken at home/i);
    expect(notes).toHaveTextContent(/judged in exactly the same way/i);
  });

  it('shows the real submission window from the edition, never a hardcoded date', async () => {
    wire();
    renderHub();

    const dates = await screen.findByTestId('challenge-hub-dates');
    expect(dates).toHaveTextContent(/24 August 2026/);
    expect(dates).toHaveTextContent(/31 August 2026/);
  });
});

describe('ChallengeHubPage — the marking guide families could never see', () => {
  it('renders every rubric dimension with its marks, from the backend', async () => {
    // The rubric lived only on the judge side. A family paying to enter could
    // not find out how the 100 points split.
    wire();
    renderHub();

    const rubric = await screen.findByTestId('challenge-hub-rubric');
    expect(rubric).toHaveTextContent('Original idea and creative decisions');
    expect(rubric).toHaveTextContent('25 marks');
    expect(rubric).toHaveTextContent('English Project Pitch');
    expect(rubric).toHaveTextContent('15 marks');
  });

  it('shows the English-fairness limits attached to the pitch mark', async () => {
    // A fairness rule a family is never shown is one they cannot rely on.
    wire();
    renderHub();

    const limits = await screen.findByTestId('rubric-limits-pitch');
    expect(limits).toHaveTextContent(/accent or pronunciation/i);
  });

  it('says the guide failed to load rather than rendering no criteria at all', async () => {
    // Silence would read as "there are no criteria", which is worse than an error.
    wire({ failRubric: true });
    renderHub();

    expect(await screen.findByTestId('challenge-hub-rubric-error')).toHaveTextContent(
      /could not load the marking guide/i,
    );
    expect(screen.queryByTestId('challenge-hub-rubric')).not.toBeInTheDocument();
  });

  it('never hardcodes the rubric — it renders exactly what the API returned', async () => {
    wire();
    renderHub();

    const rubric = await screen.findByTestId('challenge-hub-rubric');
    // Two dimensions in the fixture; a page carrying its own copy would show six.
    expect(rubric.querySelectorAll('li[class*="rounded-2xl"]').length).toBe(
      RUBRIC.dimensions.length,
    );
  });
});

describe('ChallengeHubPage — the links a family needs', () => {
  it('points at the public Showcase', async () => {
    wire();
    renderHub();

    expect(await screen.findByTestId('challenge-hub-showcase-link')).toHaveAttribute(
      'href',
      `/challenge/${SLUG}/showcase`,
    );
  });

  it('gives the parent a studio they can actually open — the public demo', async () => {
    // "Build in Creative Code Studio" named a place a parent cannot reach: the
    // studio proper is a kid surface and bounces them to /portal. /try/playground
    // is the one version they can open, and it needs no account.
    wire();
    renderHub();

    const link = await screen.findByTestId('challenge-hub-step-link-start-building');
    expect(link).toHaveAttribute('href', '/try/playground');
    expect(link).toHaveTextContent(/Creative Code Studio/i);
    // Never "no login needed": the parent reading this IS signed in, so that
    // wording reads as nonsense or as an instruction to sign out. Whose account
    // the studio lives in is the actual point.
    expect(link.textContent ?? '').not.toMatch(/no login/i);
  });

  it('offers the device handoff on an ENTERED child, where it is actually needed', async () => {
    // A parent cannot open their child's studio or submit page however signed in
    // they are — `/learn/*` bounces a parent principal. The handoff was only on
    // the family page, nowhere near the moment a parent needs it.
    wire();
    renderHub();

    const entered = await screen.findByTestId('challenge-hub-kid-kid-1');
    expect(entered.textContent ?? '').toMatch(/device/i);
    // Not offered for a child with no entry — there is nothing to hand over yet.
    expect(screen.getByTestId('challenge-hub-kid-kid-3').textContent ?? '').not.toMatch(/device/i);
  });

  it('explains that the button signs the child in without closing the parent page', async () => {
    wire();
    renderHub();

    expect(await screen.findByTestId('challenge-hub-submit-note')).toHaveTextContent(
      /signs that child in and opens challenge.*submit in a new tab/i,
    );
  });
});

describe('ChallengeHubPage — the walkthrough is always reachable (§13)', () => {
  const notStarted = {
    kid_id: 'kid-1',
    kid_nickname: 'Mia',
    entry_id: 'e1',
    status: 'registration_confirmed',
    progress_state: 'entered',
    designated_project_id: null,
    at_risk: false,
  };

  it('plays inline while a child still has not started', async () => {
    wire({ familyEntries: [notStarted] });
    renderHub();

    expect(
      await screen.findByTestId('challenge-orientation-video', undefined, { timeout: 5_000 }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('challenge-orientation-video-expand')).not.toBeInTheDocument();
  });

  it('collapses to a one-line row once everyone is building', async () => {
    // A family mid-build does not need re-explaining — but must still be able
    // to find it, so it collapses rather than disappearing.
    wire({ familyEntries: [{ ...notStarted, progress_state: 'building' }] });
    renderHub();

    expect(
      await screen.findByTestId('challenge-orientation-video-expand', undefined, {
        timeout: 5_000,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('challenge-orientation-video')).not.toBeInTheDocument();
  });

  it('expands the collapsed row back into the real player on click', async () => {
    wire({ familyEntries: [{ ...notStarted, progress_state: 'submitted' }] });
    renderHub();

    fireEvent.click(await screen.findByTestId('challenge-orientation-video-expand'));
    expect(screen.getByTestId('challenge-orientation-video')).toBeInTheDocument();
  });

  it('renders no player at all when the edition carries no video', async () => {
    wire({ familyEntries: [notStarted] });
    apiMock.mockImplementation((path: string) => {
      if (path === '/challenges/rubric') return Promise.resolve(RUBRIC);
      if (path.includes('/family-entries')) {
        return Promise.resolve({
          edition: { ...EDITION, orientation_video_url: null },
          entries: [notStarted],
        });
      }
      if (path === '/families/fam-1/kids') return Promise.resolve(KIDS);
      const match = /kid_id=([^&]+)/.exec(path);
      const kidId = match ? decodeURIComponent(match[1]) : null;
      return Promise.resolve({
        edition: { ...EDITION, orientation_video_url: null },
        kid_id: kidId,
        entry: null,
      });
    });
    renderHub();

    expect(await screen.findByTestId('challenge-hub-steps')).toBeInTheDocument();
    expect(screen.queryByTestId('challenge-orientation-video')).not.toBeInTheDocument();
    expect(screen.queryByTestId('challenge-orientation-video-expand')).not.toBeInTheDocument();
  });
});

describe('Portal navigation target', () => {
  it('points at the hub, not the single-child register form', () => {
    // The nav pointed straight at /register, which is why a parent never saw a
    // family-level view at all.
    expect(CHALLENGE_PORTAL_PATH).toBe(`/portal/challenge/${SLUG}`);
    expect(CHALLENGE_PORTAL_PATH.endsWith('/register')).toBe(false);
  });
});
