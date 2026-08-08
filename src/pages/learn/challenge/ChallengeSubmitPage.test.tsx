// @vitest-environment jsdom
// Creative Code Challenge — the child's submission screen
// (/learn/challenge/:slug/submit, creative-code-challenge-prd.md §5 flow 4).
//
// What these tests defend, in order of how much damage the failure would do:
//   1. a FAILED pitch upload never presents the entry as sent — nothing is
//      registered, nothing is POSTed, and the child is told what to do;
//   2. only the child's OWN, playable projects are offered;
//   3. submit posts exactly the payload the backend contract expects, with the
//      pitch artifact the upload actually produced;
//   4. after the deadline, editing is gone and the DATE is explained — never a
//      dead button;
//   5. an existing submission's state (including a rejection reason) is on
//      screen, so a child and their parent are not left guessing.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, me, MockApiError } = vi.hoisted(() => {
  class MockApiError extends Error {
    constructor(
      public status: number,
      public code = 'ERR',
      message = 'err',
      public details?: unknown,
    ) {
      super(message);
    }
  }
  return {
    api: vi.fn(),
    me: { data: { kind: 'kid', sub: 'kid-1', nickname: 'Mia' } as Record<string, unknown> },
    MockApiError,
  };
});

vi.mock('@/lib/api', () => ({ api, ApiError: MockApiError }));
vi.mock('@/auth/useAuth', () => ({ useMe: () => me }));

import { ChallengeSubmitPage } from './ChallengeSubmitPage';

const SLUG = 'creative-code-challenge-2026-junior';
const STATE_PATH = `/challenges/by-slug/${SLUG}/submission`;
const SUBMISSION_PATH = '/challenges/ed_1/submission';
const PROJECTS_PATH = '/kids/kid-1/projects';
const PRESIGN_PATH = '/projects/prj_game/artifacts/upload-url';
const REGISTER_PATH = '/projects/prj_game/artifacts';

// Midday UTC on purpose: the page formats these in the VIEWER's timezone (an
// AU family should read an AU date), so a fixture pinned to midnight would flip
// a calendar day depending on where the test runs.
const OPEN = '2026-08-24T12:00:00.000Z';
const CLOSE = '2026-08-31T12:00:00.000Z';

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prj_game',
    title: 'Cat Escape',
    kind: 'game',
    product_line: 'line_b_coding',
    visibility: 'private',
    class_id: null,
    thumbnail_s3_key: null,
    star_cost_total: 0,
    artifact_count: 0,
    status: 'in_progress',
    updated_at: OPEN,
    ...overrides,
  };
}

function submissionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_1',
    entry_id: 'entry_1',
    edition_id: 'ed_1',
    project_type: 'game',
    project_id: 'prj_game',
    pitch_artifact_id: 'art_1',
    one_change_note: 'My friend said the cat was too fast so I slowed it down.',
    display_name: 'Mia C.',
    status: 'submitted',
    reviewed_at: null,
    rejection_reason: null,
    created_at: OPEN,
    ...overrides,
  };
}

function stateView(overrides: Record<string, unknown> = {}) {
  return {
    edition_id: 'ed_1',
    edition_slug: SLUG,
    edition_name: 'Creative Code Challenge — Junior',
    kid_id: 'kid-1',
    entry_id: 'entry_1',
    entry_status: 'registration_confirmed',
    submission_open: OPEN,
    submission_close: CLOSE,
    window_open: true,
    submission: null,
    ...overrides,
  };
}

const SIGNED_UPLOAD = {
  url: 'https://s3.example/put',
  method: 'PUT',
  headers: { 'Content-Type': 'video/mp4' },
  s3_key: 'kid-1/video/abc.mp4',
};

interface ApiOpts {
  method?: string;
  body?: unknown;
}
type Handler = unknown | ((opts: ApiOpts) => unknown);

function wireApi(handlers: Record<string, Handler> = {}) {
  api.mockImplementation((path: string, opts: ApiOpts = {}) => {
    const key = `${opts.method ?? 'GET'} ${path}`;
    if (key in handlers) {
      const handler = handlers[key];
      const value = typeof handler === 'function' ? handler(opts) : handler;
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    }
    if (path === STATE_PATH) return Promise.resolve(stateView());
    if (path === PROJECTS_PATH) return Promise.resolve([project()]);
    if (path === PRESIGN_PATH) return Promise.resolve(SIGNED_UPLOAD);
    if (path === REGISTER_PATH) return Promise.resolve({ id: 'art_new' });
    return Promise.resolve(undefined);
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/learn/challenge/${SLUG}/submit`]}>
        <Routes>
          <Route path="/learn/challenge/:slug/submit" element={<ChallengeSubmitPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function videoFile(size = 1024, type = 'video/mp4') {
  const file = new File(['x'], 'pitch.mp4', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

async function fillForm() {
  const form = await screen.findByTestId('challenge-form');
  fireEvent.change(screen.getByTestId('challenge-project'), { target: { value: 'prj_game' } });
  fireEvent.change(screen.getByTestId('challenge-note'), {
    target: { value: 'My friend said the cat was too fast so I slowed it down.' },
  });
  fireEvent.change(screen.getByTestId('challenge-display-name'), { target: { value: 'Mia C.' } });
  fireEvent.change(screen.getByTestId('challenge-pitch'), {
    target: { files: [videoFile()] },
  });
  return form;
}

/** The S3 PUT. Defaults to succeeding; individual tests make it fail. */
function stubFetch(ok = true, throws = false) {
  const impl = throws
    ? vi.fn().mockRejectedValue(new Error('offline'))
    : vi.fn().mockResolvedValue({ ok } as Response);
  vi.stubGlobal('fetch', impl);
  return impl;
}

beforeEach(() => {
  me.data = { kind: 'kid', sub: 'kid-1', nickname: 'Mia' };
  vi.useFakeTimers({ shouldAdvanceTime: true });
  // Inside [OPEN, CLOSE] unless a test moves it.
  vi.setSystemTime(new Date('2026-08-27T10:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('ChallengeSubmitPage — only the child’s own projects are offered', () => {
  it('asks for the projects of the kid in the TOKEN, and lists only playable ones', async () => {
    wireApi({
      [`GET ${PROJECTS_PATH}`]: [
        project(),
        project({ id: 'prj_code', title: 'My Website', kind: 'code' }),
        project({ id: 'prj_blocks', title: 'Monkey King', kind: 'blocks' }),
        // Not playable — an Art Studio picture cannot be a challenge entry, and
        // the backend would refuse it (PROJECT_NOT_PLAYABLE).
        project({ id: 'prj_art', title: 'My Drawing', kind: 'creative' }),
      ],
    });
    renderPage();

    const picker = (await screen.findByTestId('challenge-project')) as HTMLSelectElement;
    const values = [...picker.options].map((option) => option.value);
    expect(values).toEqual(['', 'prj_game', 'prj_code', 'prj_blocks']);
    expect(screen.queryByText('My Drawing')).not.toBeInTheDocument();

    // The listing is scoped by the token's kid id — never a URL parameter.
    expect(api).toHaveBeenCalledWith(PROJECTS_PATH);
  });

  it('says what to do when the child has no playable project yet', async () => {
    wireApi({ [`GET ${PROJECTS_PATH}`]: [project({ id: 'prj_art', kind: 'creative' })] });
    renderPage();
    expect(await screen.findByTestId('no-projects')).toHaveTextContent(
      /Make a game or a code project first/i,
    );
  });
});

describe('ChallengeSubmitPage — submitting', () => {
  it('uploads the pitch video, then posts the expected payload', async () => {
    const put = stubFetch(true);
    const posted: Array<{ path: string; body: unknown }> = [];
    wireApi({
      [`POST ${SUBMISSION_PATH}`]: (opts: ApiOpts) => {
        posted.push({ path: SUBMISSION_PATH, body: opts.body });
        return submissionRow();
      },
    });
    renderPage();
    const form = await fillForm();
    fireEvent.submit(form);

    await waitFor(() => expect(posted).toHaveLength(1));
    expect(put).toHaveBeenCalledWith(SIGNED_UPLOAD.url, expect.objectContaining({ method: 'PUT' }));
    expect(posted[0]!.body).toEqual({
      project_id: 'prj_game',
      project_type: 'game',
      one_change_note: 'My friend said the cat was too fast so I slowed it down.',
      display_name: 'Mia C.',
      // The id the register call actually returned — never a guess.
      pitch_artifact_id: 'art_new',
    });

    // The confirmed state replaces the form.
    expect(await screen.findByTestId('challenge-status-submitted')).toBeInTheDocument();
  });

  it('registers the artifact as a video hung off the chosen project', async () => {
    stubFetch(true);
    const registered: unknown[] = [];
    wireApi({
      [`POST ${REGISTER_PATH}`]: (opts: ApiOpts) => {
        registered.push(opts.body);
        return { id: 'art_new' };
      },
      [`POST ${SUBMISSION_PATH}`]: submissionRow(),
    });
    renderPage();
    fireEvent.submit(await fillForm());

    await waitFor(() => expect(registered).toHaveLength(1));
    expect(registered[0]).toMatchObject({ kind: 'video', s3_key: SIGNED_UPLOAD.s3_key });
    // The metadata carries nothing about the child.
    expect(registered[0]).toMatchObject({ metadata: { source: 'challenge-pitch' } });
  });
});

describe('ChallengeSubmitPage — a failed upload is never a submission', () => {
  it('a rejected S3 PUT surfaces an error, registers nothing and posts nothing', async () => {
    stubFetch(false);
    const calls: string[] = [];
    wireApi({
      [`POST ${REGISTER_PATH}`]: (opts: ApiOpts) => {
        calls.push(`register ${JSON.stringify(opts.body)}`);
        return { id: 'art_new' };
      },
      [`POST ${SUBMISSION_PATH}`]: () => {
        calls.push('submit');
        return submissionRow();
      },
    });
    renderPage();
    fireEvent.submit(await fillForm());

    const error = await screen.findByTestId('challenge-error');
    expect(error).toHaveTextContent(/did not finish uploading/i);
    expect(error).toHaveTextContent(/nothing has been sent in yet/i);
    // The two things that must NOT have happened.
    expect(calls).toEqual([]);
    expect(screen.queryByTestId('challenge-status-submitted')).not.toBeInTheDocument();
    // The form is still there so the child can simply press send again.
    expect(screen.getByTestId('challenge-form')).toBeInTheDocument();
  });

  it('a network failure mid-upload reads the same way', async () => {
    stubFetch(true, true);
    const calls: string[] = [];
    wireApi({
      [`POST ${SUBMISSION_PATH}`]: () => {
        calls.push('submit');
        return submissionRow();
      },
    });
    renderPage();
    fireEvent.submit(await fillForm());

    expect(await screen.findByTestId('challenge-error')).toHaveTextContent(
      /nothing has been sent in yet/i,
    );
    expect(calls).toEqual([]);
  });

  it('a video that is too big is refused before anything is uploaded', async () => {
    const put = stubFetch(true);
    wireApi();
    renderPage();
    await fillForm();
    fireEvent.change(screen.getByTestId('challenge-pitch'), {
      target: { files: [videoFile(60 * 1024 * 1024)] },
    });
    fireEvent.submit(screen.getByTestId('challenge-form'));

    expect(await screen.findByTestId('challenge-error')).toHaveTextContent(/too big/i);
    expect(put).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalledWith(PRESIGN_PATH, expect.anything());
  });

  it('a file that is not a video is refused before anything is presigned', async () => {
    const put = stubFetch(true);
    const calls: string[] = [];
    wireApi({
      [`POST ${REGISTER_PATH}`]: () => {
        calls.push('register');
        return { id: 'art_new' };
      },
      [`POST ${SUBMISSION_PATH}`]: () => {
        calls.push('submit');
        return submissionRow();
      },
    });
    renderPage();
    await fillForm();
    // `accept="video/*"` is a hint to the file picker, not a guarantee: a child
    // can drag a file in, and some platforms report an empty or non-video type.
    fireEvent.change(screen.getByTestId('challenge-pitch'), {
      target: { files: [videoFile(1024, 'image/png')] },
    });
    fireEvent.submit(screen.getByTestId('challenge-form'));

    expect(await screen.findByTestId('challenge-error')).toBeInTheDocument();
    expect(put).not.toHaveBeenCalled();
    expect(api).not.toHaveBeenCalledWith(PRESIGN_PATH, expect.anything());
    expect(calls).toEqual([]);
    expect(screen.queryByTestId('challenge-status-submitted')).not.toBeInTheDocument();
  });

  it('sending with no video chosen says to add one — not that an upload failed', async () => {
    const put = stubFetch(true);
    const calls: string[] = [];
    wireApi({
      [`POST ${SUBMISSION_PATH}`]: () => {
        calls.push('submit');
        return submissionRow();
      },
    });
    renderPage();
    // Everything EXCEPT the video.
    await screen.findByTestId('challenge-form');
    fireEvent.change(screen.getByTestId('challenge-project'), { target: { value: 'prj_game' } });
    fireEvent.change(screen.getByTestId('challenge-note'), { target: { value: 'I slowed the cat.' } });
    fireEvent.change(screen.getByTestId('challenge-display-name'), { target: { value: 'Mia C.' } });
    fireEvent.submit(screen.getByTestId('challenge-form'));

    const error = await screen.findByTestId('challenge-error');
    expect(error).toHaveTextContent(/Add your talking video/i);
    // The wrong copy here would send a child to fix a problem they do not have.
    expect(error).not.toHaveTextContent(/did not finish uploading/i);
    expect(put).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
  });

  it('a backend refusal is shown in words, without the code, and nothing is claimed', async () => {
    stubFetch(true);
    wireApi({
      [`POST ${SUBMISSION_PATH}`]: new MockApiError(
        409,
        'ENTRY_NOT_CONFIRMED',
        'This kid does not have a confirmed registration for this challenge edition.',
      ),
    });
    renderPage();
    fireEvent.submit(await fillForm());

    const error = await screen.findByTestId('challenge-error');
    expect(error).toHaveTextContent(/Ask a grown-up to finish signing you up/i);
    expect(error).not.toHaveTextContent(/ENTRY_NOT_CONFIRMED/);
    expect(screen.queryByTestId('challenge-status-submitted')).not.toBeInTheDocument();
  });
});

describe('ChallengeSubmitPage — the deadline', () => {
  it('after the close date there is no edit button, and the date is explained', async () => {
    vi.setSystemTime(new Date('2026-09-02T00:00:00.000Z'));
    wireApi({ [`GET ${STATE_PATH}`]: stateView({ window_open: false, submission: submissionRow() }) });
    renderPage();

    expect(await screen.findByTestId('challenge-locked')).toHaveTextContent(/closed on 31 Aug 2026/);
    expect(screen.queryByTestId('challenge-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('challenge-form')).not.toBeInTheDocument();
    // What WAS sent is still shown — the page never goes blank at the deadline.
    expect(screen.getByTestId('challenge-status-submitted')).toBeInTheDocument();
  });

  it('after the close date with nothing sent, it explains rather than showing a dead form', async () => {
    vi.setSystemTime(new Date('2026-09-02T00:00:00.000Z'));
    wireApi({ [`GET ${STATE_PATH}`]: stateView({ window_open: false }) });
    renderPage();

    expect(await screen.findByTestId('challenge-missed')).toHaveTextContent(/deadline was 31 Aug 2026/);
    expect(screen.queryByTestId('challenge-form')).not.toBeInTheDocument();
  });

  it('before the open date it says when the door opens, and offers no form', async () => {
    vi.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
    wireApi({ [`GET ${STATE_PATH}`]: stateView({ window_open: false }) });
    renderPage();

    expect(await screen.findByTestId('challenge-not-open')).toHaveTextContent(/opens on 24 Aug 2026/);
    expect(screen.queryByTestId('challenge-form')).not.toBeInTheDocument();
  });

  it('inside the window an existing entry can still be changed', async () => {
    stubFetch(true);
    const patched: unknown[] = [];
    wireApi({
      [`GET ${STATE_PATH}`]: stateView({ submission: submissionRow() }),
      [`PATCH ${SUBMISSION_PATH}`]: (opts: ApiOpts) => {
        patched.push(opts.body);
        return submissionRow({ display_name: 'Mia the Coder' });
      },
    });
    renderPage();

    fireEvent.click(await screen.findByTestId('challenge-edit'));
    fireEvent.change(await screen.findByTestId('challenge-display-name'), {
      target: { value: 'Mia the Coder' },
    });
    fireEvent.submit(screen.getByTestId('challenge-form'));

    await waitFor(() => expect(patched).toHaveLength(1));
    // No new video was picked, so the artifact already on the entry is reused.
    expect(patched[0]).toMatchObject({ display_name: 'Mia the Coder', pitch_artifact_id: 'art_1' });
  });
});

describe('ChallengeSubmitPage — the state is always on screen', () => {
  it('renders an existing submission and its status', async () => {
    wireApi({ [`GET ${STATE_PATH}`]: stateView({ submission: submissionRow({ status: 'in_review' }) }) });
    renderPage();

    expect(await screen.findByTestId('challenge-status-in_review')).toHaveTextContent(
      /looking at it now/i,
    );
  });

  it('a rejection shows the reason and how to fix it — never that the child failed', async () => {
    wireApi({
      [`GET ${STATE_PATH}`]: stateView({
        submission: submissionRow({
          status: 'rejected',
          rejection_reason: 'The video shows your school jumper — please film without it.',
        }),
      }),
    });
    renderPage();

    const card = await screen.findByTestId('challenge-status-rejected');
    expect(card).toHaveTextContent(/One thing needs changing/i);
    expect(screen.getByTestId('challenge-rejection-reason')).toHaveTextContent(/school jumper/);
    expect(card).not.toHaveTextContent(/fail/i);
    // Inside the window a rejection is fixable.
    expect(screen.getByTestId('challenge-edit')).toBeInTheDocument();
  });

  it('an unpaid entry sends the child to a grown-up instead of a form', async () => {
    wireApi({ [`GET ${STATE_PATH}`]: stateView({ entry_status: 'pending_payment' }) });
    renderPage();

    expect(await screen.findByTestId('challenge-not-entered')).toHaveTextContent(
      /Ask a grown-up to finish signing you up/i,
    );
    expect(screen.queryByTestId('challenge-form')).not.toBeInTheDocument();
  });

  it('a failed read is recoverable, not a dead end', async () => {
    wireApi({ [`GET ${STATE_PATH}`]: new MockApiError(404, 'NOT_FOUND', 'Not found.') });
    renderPage();

    expect(await screen.findByTestId('challenge-load-error')).toHaveTextContent(
      /could not find this challenge/i,
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
