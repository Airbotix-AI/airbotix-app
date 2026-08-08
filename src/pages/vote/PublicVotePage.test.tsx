// @vitest-environment jsdom
// PUBLIC Creative Code Challenge voting + Creator Showcase
// (`/vote/:slug`, `/challenge/:slug/showcase`; creative-code-challenge-prd.md
// §5 flow 7/9, D-CCC-4).
//
// What these tests defend, in order of how much damage the failure would do:
//   1. **no child's media is exposed** — the card renders a name and a kind, and
//      there is no video, image, iframe or play link anywhere on the page, so a
//      declined `publish_face` / `publish_voice` grant cannot leak through a
//      surface that never had one;
//   2. **the tally stays hidden** — no entry card and no receipt renders a
//      number, a rank or a progress bar, asserted on the container text rather
//      than on intent;
//   3. **the order is the server's shuffle** — rendered as received, re-drawn on
//      every visit, never sorted;
//   4. **a failed load is not an empty Showcase** — different screen, different
//      words, with a retry;
//   5. **an unauthenticated visitor gets in**, and no token or cookie is sent
//      even when somebody is signed in on the same browser;
//   6. duplicate / window / rate-limit refusals arrive as sentences, not codes;
//   7. **no analytics** is initialised on this surface.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/auth/authStore';
import { isPortalSurface } from '@/lib/analytics';
import { PublicVotePage } from './PublicVotePage';

const SLUG = 'creative-code-challenge-2026-junior';
const SHOWCASE_PATH = `/challenges/by-slug/${SLUG}/showcase`;
const VOTES_PATH = `/challenges/by-slug/${SLUG}/votes`;
const REFERRAL_PATH = `${VOTES_PATH}/referral`;
const GROUP_SHARE_PATH = `${VOTES_PATH}/bonus/group-share`;

// Midday UTC on purpose: the page formats these in the VIEWER's timezone, so a
// fixture pinned to midnight would flip a calendar day depending on where the
// test runs.
const VOTING_OPEN = '2026-09-01T12:00:00.000Z';
const VOTING_CLOSE = '2026-09-10T12:00:00.000Z';

const BONUS_TOKEN = 'a'.repeat(64);

interface Failure {
  status: number;
  body: unknown;
}

function fail(status: number, code: string, message = 'refused', details?: unknown): Failure {
  return { status, body: { error: { code, message, details } } };
}

function isFailure(value: unknown): value is Failure {
  return typeof value === 'object' && value !== null && 'status' in value && 'body' in value;
}

type Handler = unknown | ((init: RequestInit) => unknown);

function jsonResponse(body: unknown, status: number): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'test',
    json: async () => body,
  } as unknown as Response;
}

/** Every request the page made, so the tests can assert what was NOT sent. */
let requests: Array<{ path: string; init: RequestInit }> = [];

function wireFetch(handlers: Record<string, Handler>) {
  const impl = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = new URL(url).pathname;
    requests.push({ path, init });
    const key = `${init.method ?? 'GET'} ${path}`;
    if (!(key in handlers)) return jsonResponse({ error: { code: 'NOT_WIRED', message: key } }, 500);
    const handler = handlers[key];
    const value = typeof handler === 'function' ? await handler(init) : handler;
    if (value instanceof Error) throw value;
    return isFailure(value) ? jsonResponse(value.body, value.status) : jsonResponse(value, 200);
  });
  vi.stubGlobal('fetch', impl);
  return impl;
}

function entry(id: string, displayName: string, projectType = 'game') {
  return { submission_id: id, display_name: displayName, project_type: projectType };
}

function showcaseView(overrides: Record<string, unknown> = {}) {
  return {
    edition_id: 'ed_1',
    edition_slug: SLUG,
    edition_name: 'Creative Code Challenge — Junior',
    voting_open: VOTING_OPEN,
    voting_close: VOTING_CLOSE,
    voting_window_open: true,
    submissions: [
      entry('sub_a', 'Mia C.'),
      entry('sub_b', 'Arjun P.', 'interactive_web'),
      entry('sub_c', 'Lily W.'),
    ],
    ...overrides,
  };
}

function receiptView(overrides: Record<string, unknown> = {}) {
  return {
    edition_id: 'ed_1',
    // Deliberately non-zero: the page must throw these away, and a fixture of 0
    // would let a rendered count slip past the "no digits" assertions below.
    votes_used: 4,
    votes_remaining: 6,
    referral: null,
    bonus_token: BONUS_TOKEN,
    ...overrides,
  };
}

function renderPage(path = `/vote/${SLUG}`, client?: QueryClient) {
  const qc = client ?? new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {/* Registered exactly as router.tsx does: no <ProtectedRoute>, no layout. */}
          <Route path="/vote/:slug" element={<PublicVotePage />} />
          <Route path="/challenge/:slug/showcase" element={<PublicVotePage mode="showcase" />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, queryClient: qc };
}

async function castVote(entryIndex = 0, email = 'grandma@example.com') {
  const cards = await screen.findAllByTestId('vote-entry');
  fireEvent.click(within(cards[entryIndex]).getByRole('radio'));
  fireEvent.change(screen.getByTestId('vote-email'), { target: { value: email } });
  fireEvent.click(screen.getByTestId('vote-submit'));
}

function renderedIds(): string[] {
  return screen.getAllByTestId('vote-entry').map((el) => el.dataset.submissionId ?? '');
}

beforeEach(() => {
  requests = [];
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Inside [VOTING_OPEN, VOTING_CLOSE] unless a test moves it.
  vi.setSystemTime(new Date('2026-09-05T10:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  useAuthStore.getState().clearToken('user');
  useAuthStore.getState().clearToken('kid');
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('PublicVotePage — an unauthenticated visitor', () => {
  it('renders the Showcase with no token and no cookies, even when a parent is signed in here', async () => {
    // The worst case for a public page in a shared SPA: a signed-in parent opens
    // the vote link in the same browser. Their access token must not be posted
    // to a `@Public()` endpoint, and the refresh cookie must not ride along.
    useAuthStore.getState().setToken('user', 'tok_parent_access');
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView() });

    renderPage();

    expect(await screen.findByText('Mia C.')).toBeInTheDocument();
    const request = requests.find((r) => r.path === SHOWCASE_PATH);
    expect(request).toBeDefined();
    expect(request!.init.credentials).toBeUndefined();
    const headers = (request!.init.headers ?? {}) as Record<string, string>;
    expect(Object.keys(headers).map((k) => k.toLowerCase())).not.toContain('authorization');
  });

  it('never initialises analytics on this surface', async () => {
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView() });
    renderPage();
    await screen.findByTestId('vote-showcase');

    // privacy-policy.md §8/§10 + lib/analytics.ts: only /portal/* is measured.
    expect(isPortalSurface(`/vote/${SLUG}`)).toBe(false);
    expect(isPortalSurface(`/challenge/${SLUG}/showcase`)).toBe(false);
    expect(document.getElementById('ga4-script')).toBeNull();
    expect(window.dataLayer).toBeUndefined();
    expect(window.gtag).toBeUndefined();
  });
});

describe('PublicVotePage — every entry is presented identically', () => {
  it('renders no video, image, iframe or play link for any entry', async () => {
    // PRD §9 has not decided what a declined publish_face / publish_voice grant
    // does to publication, so no media is served and none may be reached for. A
    // page that linked a submission id into /play would publish a child's work
    // against a grant nobody read.
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView() });
    const { container } = renderPage();

    const showcase = await screen.findByTestId('vote-showcase');
    expect(showcase.querySelectorAll('video, audio, img, iframe, embed, object')).toHaveLength(0);
    expect(container.querySelectorAll('a[href*="/play/"]')).toHaveLength(0);
    expect(container.querySelectorAll('a[href*="/learn/"]')).toHaveLength(0);
    // What IS shown: the consented display name and the kind of project, for
    // every entry, in the same words.
    const cards = screen.getAllByTestId('vote-entry');
    expect(cards).toHaveLength(3);
    for (const card of cards) {
      expect(within(card).getByRole('radio')).toBeInTheDocument();
      expect(within(card).getByText('Vote for this entry')).toBeInTheDocument();
    }
    expect(screen.getAllByText('A game you play')).toHaveLength(2);
    expect(screen.getByText('A web page you click around')).toBeInTheDocument();
  });

  it('states the entry format once, for all of them, and says the media is not published', async () => {
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView() });
    renderPage();

    const note = await screen.findByTestId('vote-entry-format');
    expect(note).toHaveTextContent(/60–90 second video/);
    expect(note).toHaveTextContent(/shown exactly the same way/);
    expect(note).toHaveTextContent(/not published on this page/);
  });
});

describe('PublicVotePage — the hidden tally (D-CCC-4)', () => {
  it('renders no number, rank or progress bar anywhere in the Showcase', async () => {
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView() });
    const { container } = renderPage();

    const showcase = await screen.findByTestId('vote-showcase');
    // The strongest available assertion: there is no digit in the entry list at
    // all, so nothing there can be read as a count or a placing.
    expect(showcase.textContent).not.toMatch(/\d/);
    expect(container.textContent).not.toMatch(
      /rank|leading|winning|most popular|votes so far|1st|2nd|3rd|in the lead/i,
    );
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
    expect(screen.queryAllByRole('meter')).toHaveLength(0);
    expect(container.querySelectorAll('progress, meter')).toHaveLength(0);
  });

  it('tells the voter only that the vote was recorded — never their budget', async () => {
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      // The server returns votes_used 4 / votes_remaining 6; neither may appear.
      [`POST ${VOTES_PATH}`]: receiptView(),
    });
    renderPage();
    await castVote();

    const receipt = await screen.findByTestId('vote-receipt');
    expect(receipt).toHaveTextContent(/your vote has been recorded/i);
    expect(receipt.textContent).not.toMatch(/\d/);
    expect(screen.queryByText(/4/)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
  });
});

describe('PublicVotePage — the order is the server’s shuffle', () => {
  it('renders entries in the order received and re-draws them on every visit', async () => {
    const orders = [
      [entry('sub_a', 'Mia C.'), entry('sub_b', 'Arjun P.'), entry('sub_c', 'Lily W.')],
      [entry('sub_c', 'Lily W.'), entry('sub_a', 'Mia C.'), entry('sub_b', 'Arjun P.')],
    ];
    let visit = 0;
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: () => showcaseView({ submissions: orders[visit++] ?? orders[0] }),
    });

    // The SAME QueryClient across both visits: a cached first draw would freeze
    // one order into every later visit, and the shuffle is the fairness rule.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const first = renderPage(`/vote/${SLUG}`, client);
    await screen.findByTestId('vote-showcase');
    expect(renderedIds()).toEqual(['sub_a', 'sub_b', 'sub_c']);
    first.unmount();

    renderPage(`/vote/${SLUG}`, client);
    await waitFor(() => expect(renderedIds()).toEqual(['sub_c', 'sub_a', 'sub_b']));
    // Not alphabetical, not by id, not stable — exactly what the server sent.
    expect(visit).toBe(2);
  });
});

describe('PublicVotePage — casting a vote', () => {
  it('posts the chosen entry and the typed email, with no invite code by default', async () => {
    const bodies: unknown[] = [];
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: (init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return receiptView();
      },
    });
    renderPage();
    await castVote(1, 'grandma@example.com');

    await screen.findByTestId('vote-receipt');
    expect(bodies).toEqual([{ email: 'grandma@example.com', submission_id: 'sub_b' }]);
  });

  it('carries an invite code from the URL, and says whose bonus it is', async () => {
    const bodies: unknown[] = [];
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: (init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return receiptView({ referral: 'granted' });
      },
    });
    renderPage(`/vote/${SLUG}?ref=abc123`);

    expect(await screen.findByTestId('vote-referral-notice')).toHaveTextContent(
      /invite only thanks the person who sent it/i,
    );
    await castVote();

    await screen.findByTestId('vote-receipt');
    expect(bodies).toEqual([
      { email: 'grandma@example.com', submission_id: 'sub_a', referral_code: 'abc123' },
    ]);
    expect(screen.getByTestId('vote-referral-outcome')).toHaveTextContent(
      /person who invited you earned their bonus vote/i,
    );
  });

  it('reports a referrer at their cap as "being checked", never as a number', async () => {
    // The server does NOT distinguish "the referrer is at the 10-vote cap" from
    // "a human still has to look" — both come back `pending_review` — so the
    // page must not invent the difference either.
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: receiptView({ referral: 'pending_review' }),
    });
    renderPage(`/vote/${SLUG}?ref=abc123`);
    await castVote();

    const outcome = await screen.findByTestId('vote-referral-outcome');
    expect(outcome).toHaveTextContent(/with our team to check/i);
    expect(outcome).toHaveTextContent(/your own vote counts/i);
    expect(outcome.textContent).not.toMatch(/\d/);
  });

  it('refuses to send without an entry or a usable email', async () => {
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView(), [`POST ${VOTES_PATH}`]: receiptView() });
    renderPage();

    await screen.findByTestId('vote-showcase');
    fireEvent.change(screen.getByTestId('vote-email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByTestId('vote-submit'));

    expect(await screen.findByText('Choose the entry you want to vote for.')).toBeInTheDocument();
    expect(screen.getByText('That does not look like an email address.')).toBeInTheDocument();
    expect(requests.filter((r) => r.path === VOTES_PATH)).toHaveLength(0);
  });
});

describe('PublicVotePage — the server’s refusals, in plain language', () => {
  it('surfaces a duplicate vote as one-vote-per-address, and shows no receipt', async () => {
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: fail(409, 'ALREADY_VOTED', 'This email address has already voted.'),
    });
    renderPage();
    await castVote();

    expect(await screen.findByTestId('vote-error')).toHaveTextContent(
      /already voted in this challenge.*one vote/is,
    );
    expect(screen.queryByTestId('vote-receipt')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vote-bonus')).not.toBeInTheDocument();
  });

  it('surfaces a closed window as a refusal, not as a silent failure', async () => {
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: fail(400, 'VOTING_CLOSED', 'Voting for this challenge is closed.', {
        voting_close: VOTING_CLOSE,
      }),
    });
    renderPage();
    await castVote();

    expect(await screen.findByTestId('vote-error')).toHaveTextContent(
      /voting has closed, so no vote was recorded/i,
    );
  });

  it('surfaces an entry that cannot be voted for without guessing why', async () => {
    // One backend code covers "does not exist", "not approved" and "withdrawn"
    // so the endpoint is not an existence probe. The copy keeps that vagueness.
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: fail(400, 'SUBMISSION_NOT_VOTABLE'),
    });
    renderPage();
    await castVote();

    const error = await screen.findByTestId('vote-error');
    expect(error).toHaveTextContent(/that entry cannot be voted for right now/i);
    expect(error.textContent).not.toMatch(/withdrew|rejected|does not exist/i);
  });

  it('surfaces the public rate limit as something to wait out — with the envelope the backend really sends', async () => {
    // The REAL shape: the backend's global filter maps every 429 to code
    // `RATE_LIMITED` inside the §7 error envelope, so a page keyed only on the
    // synthesised `HTTP_429` fell through and echoed the raw server sentence at
    // an anonymous visitor.
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: fail(429, 'RATE_LIMITED', 'ThrottlerException: Too Many Requests'),
    });
    renderPage();
    await castVote();

    const error = await screen.findByTestId('vote-error');
    expect(error).toHaveTextContent(/wait a minute and try again/i);
    expect(error.textContent).not.toMatch(/ThrottlerException/);
  });

  it('says the same thing when a proxy throttles ahead of the backend and sends no envelope', async () => {
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: { status: 429, body: 'Too Many Requests' },
    });
    renderPage();
    await castVote();

    expect(await screen.findByTestId('vote-error')).toHaveTextContent(/wait a minute and try again/i);
  });

  it('drops a refused invite code and says so, so the vote itself can go through', async () => {
    let attempt = 0;
    const bodies: unknown[] = [];
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: (init: RequestInit) => {
        bodies.push(JSON.parse(String(init.body)));
        return attempt++ === 0 ? fail(400, 'REFERRAL_CODE_INVALID') : receiptView();
      },
    });
    renderPage(`/vote/${SLUG}?ref=stale-code`);
    await castVote();

    expect(await screen.findByTestId('vote-error')).toHaveTextContent(
      /invite link you followed is not valid/i,
    );
    expect(screen.getByTestId('vote-referral-dropped')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('vote-submit'));
    await screen.findByTestId('vote-receipt');
    expect(bodies).toEqual([
      { email: 'grandma@example.com', submission_id: 'sub_a', referral_code: 'stale-code' },
      { email: 'grandma@example.com', submission_id: 'sub_a' },
    ]);
  });
});

describe('PublicVotePage — loading, failure and emptiness are three different screens', () => {
  it('shows a named error with a retry when the Showcase cannot be loaded', async () => {
    let call = 0;
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: () =>
        call++ === 0 ? fail(500, 'INTERNAL', 'boom') : showcaseView(),
    });
    renderPage();

    const error = await screen.findByTestId('vote-load-error');
    expect(error).toHaveTextContent(/not an empty challenge/i);
    // The failure must never be dressed up as "no entries".
    expect(screen.queryByTestId('vote-empty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vote-showcase')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Try again'));
    expect(await screen.findByText('Mia C.')).toBeInTheDocument();
  });

  it('says the connection dropped when the request never left the browser', async () => {
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: new Error('offline') });
    renderPage();

    expect(await screen.findByTestId('vote-load-error')).toHaveTextContent(
      /could not reach airbotix just now/i,
    );
    expect(screen.queryByTestId('vote-empty')).not.toBeInTheDocument();
  });

  it('says a challenge with no approved entries yet is empty — not broken', async () => {
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView({ submissions: [] }) });
    renderPage();

    expect(await screen.findByTestId('vote-empty')).toHaveTextContent(
      /no entries have been added to the showcase yet/i,
    );
    expect(screen.queryByTestId('vote-load-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vote-submit')).not.toBeInTheDocument();
  });
});

describe('PublicVotePage — the voting window', () => {
  it('offers no vote controls before voting opens, and says when it does', async () => {
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView({
        voting_window_open: false,
        voting_open: '2026-09-20T12:00:00.000Z',
        voting_close: '2026-09-30T12:00:00.000Z',
      }),
    });
    renderPage();

    expect(await screen.findByTestId('vote-not-open')).toHaveTextContent(/you can vote from/i);
    expect(screen.getByTestId('vote-window')).toHaveTextContent(/voting opens on/i);
    // A dead control is worse than none: there is no email field and no radio.
    expect(screen.queryByTestId('vote-email')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('offers no vote controls after voting closes', async () => {
    vi.setSystemTime(new Date('2026-09-20T10:00:00.000Z'));
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView({ voting_window_open: false }) });
    renderPage();

    expect(await screen.findByTestId('vote-closed')).toHaveTextContent(/voting closed on/i);
    expect(screen.queryByTestId('vote-submit')).not.toBeInTheDocument();
    // The entries stay readable — the Showcase outlives the vote.
    expect(screen.getAllByTestId('vote-entry')).toHaveLength(3);
  });
});

describe('Creator Showcase — /challenge/:slug/showcase', () => {
  it('shows the same entries with no voting controls at all', async () => {
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView() });
    renderPage(`/challenge/${SLUG}/showcase`);

    const showcase = await screen.findByTestId('vote-showcase');
    expect(screen.getAllByTestId('vote-entry')).toHaveLength(3);
    expect(screen.queryByTestId('vote-email')).not.toBeInTheDocument();
    expect(screen.queryByTestId('vote-submit')).not.toBeInTheDocument();
    expect(showcase.textContent).not.toMatch(/\d/);
    // While voting is open it points at the voting surface rather than duplicating it.
    expect(screen.getByTestId('vote-link')).toHaveAttribute('href', `/vote/${SLUG}`);
  });
});

describe('PublicVotePage — the optional bonus tasks', () => {
  it('offers nothing until this visitor has actually voted', async () => {
    wireFetch({ [`GET ${SHOWCASE_PATH}`]: showcaseView() });
    renderPage();
    await screen.findByTestId('vote-showcase');
    expect(screen.queryByTestId('vote-bonus')).not.toBeInTheDocument();
  });

  it('gives the voter a link to copy and share — never asks for anyone else’s email', async () => {
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: receiptView(),
      [`POST ${REFERRAL_PATH}`]: {
        edition_id: 'ed_1',
        referral_code: 'ref_code_123',
        votes_used: 4,
        votes_remaining: 6,
      },
    });
    renderPage();
    await castVote();

    fireEvent.click(await screen.findByTestId('vote-referral-create'));
    const url = (await screen.findByTestId('vote-referral-url')) as HTMLInputElement;
    expect(url.value).toBe(`${window.location.origin}/vote/${SLUG}?ref=ref_code_123`);
    // The bonus capability never travels in the shareable link (PRD §9 open).
    expect(url.value).not.toContain(BONUS_TOKEN);

    // Nowhere on the page is a friend's address asked for.
    const panel = screen.getByTestId('vote-bonus');
    expect(within(panel).queryByLabelText(/friend/i)).not.toBeInTheDocument();
    expect(panel).toHaveTextContent(/never ask for anyone else’s email address/i);
    expect(screen.getByTestId('vote-bonus-scope')).toHaveTextContent(/live on this screen only/i);

    // The referral request proves the caller with the one-shot token.
    const referralRequest = requests.find((r) => r.path === REFERRAL_PATH);
    expect(JSON.parse(String(referralRequest!.init.body))).toEqual({
      email: 'grandma@example.com',
      bonus_token: BONUS_TOKEN,
    });
  });

  it('files a group share as pending, and never claims it counted', async () => {
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: receiptView(),
      [`POST ${GROUP_SHARE_PATH}`]: {
        edition_id: 'ed_1',
        status: 'pending_review',
        votes_used: 4,
        votes_remaining: 6,
      },
    });
    renderPage();
    await castVote();

    await screen.findByTestId('vote-bonus');
    fireEvent.change(screen.getByTestId('vote-group-share'), {
      target: { value: 'https://example.com/my-post' },
    });
    fireEvent.submit(screen.getByTestId('vote-group-share-form'));

    const status = await screen.findByTestId('vote-group-share-status');
    expect(status).toHaveTextContent(/a person will check your group share/i);
    expect(status).toHaveTextContent(/counts nothing until they do/i);
    expect(status.textContent).not.toMatch(/\d/);
  });

  it('explains a bonus the server will not match to a vote', async () => {
    wireFetch({
      [`GET ${SHOWCASE_PATH}`]: showcaseView(),
      [`POST ${VOTES_PATH}`]: receiptView(),
      [`POST ${REFERRAL_PATH}`]: fail(404, 'VOTE_REQUIRED'),
    });
    renderPage();
    await castVote();

    fireEvent.click(await screen.findByTestId('vote-referral-create'));
    expect(await screen.findByTestId('vote-referral-error')).toHaveTextContent(
      /your vote itself is safe/i,
    );
  });
});
