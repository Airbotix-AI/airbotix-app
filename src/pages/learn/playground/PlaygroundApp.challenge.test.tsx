// @vitest-environment jsdom
// The challenge-aware studio strip (creative-code-challenge-entrant-onboarding-prd
// §8.3, execution plan PR 5).
//
// What these tests defend, in order of how much damage the failure would do:
//   1. **The strip is ABSENT everywhere it does not belong** — class work,
//      teacher prep, the read-only teacher live view, the public try-demo and
//      every ordinary personal project. `PlaygroundApp` carries six modes; a
//      strip that leaks into one of them puts competition chrome (and a
//      designate button that would write to somebody else's entry) in front of
//      the wrong person.
//   2. **Challenge context is PERSISTED, not carried in the URL.** The studio
//      `replaceState`s to `/learn/playground/<newId>` right after creating a
//      project, discarding every query param — so the slug must ride the CREATE
//      call, and a resumed session must recover the context from the project.
//   3. Nothing absent from the entry record is rendered, and a failed read
//      renders nothing at all rather than an error card over a child's studio.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, createGameProjectMock, getProjectMock, useMeMock, useDemoModeMock } = vi.hoisted(
  () => ({
    api: vi.fn(),
    createGameProjectMock: vi.fn(),
    getProjectMock: vi.fn(),
    useMeMock: vi.fn(),
    useDemoModeMock: vi.fn(),
  }),
);

vi.mock('@/lib/api', () => ({
  api,
  ApiError: class extends Error {},
}));
vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));
vi.mock('@/pages/try/demoMode', async (orig) => {
  const actual = await orig<typeof import('@/pages/try/demoMode')>();
  return { ...actual, useDemoMode: useDemoModeMock };
});
vi.mock('../code/codeApi', async (orig) => {
  const actual = await orig<typeof import('../code/codeApi')>();
  return { ...actual, getProject: getProjectMock, readVfs: vi.fn().mockResolvedValue([]) };
});
vi.mock('./panes/playgroundApi', async (orig) => {
  const actual = await orig<typeof import('./panes/playgroundApi')>();
  return {
    ...actual,
    createGameProject: createGameProjectMock,
    placeGameProjectForClass: vi.fn().mockResolvedValue(undefined),
  };
});
// Neither the generating flow nor the workspace is under test here; both pull in
// engines, canvases and streams the strip has nothing to do with.
vi.mock('./GeneratingScreen', () => ({
  GeneratingScreen: () => <div data-testid="generating-project" />,
}));
vi.mock('./Workspace', () => ({ Workspace: () => <div data-testid="workspace" /> }));

import { PlaygroundApp } from './PlaygroundApp';

const SLUG = 'creative-code-challenge-2026-junior';
const OPEN = '2026-08-24T12:00:00.000Z';
const CLOSE = '2026-08-31T12:00:00.000Z';

function entry(overrides: Record<string, unknown> = {}) {
  return {
    edition_id: 'ed_1',
    slug: SLUG,
    name: 'Creative Code Challenge — Junior',
    entry_id: 'entry_1',
    entry_status: 'registration_confirmed',
    progress_state: 'building',
    designated_project_id: null,
    submission_open: OPEN,
    submission_close: CLOSE,
    ...overrides,
  };
}

interface ApiOpts {
  method?: string;
  body?: unknown;
}

function wireApi(handlers: Record<string, unknown | ((o: ApiOpts) => unknown)> = {}) {
  api.mockImplementation((path: string, opts: ApiOpts = {}) => {
    const key = `${opts.method ?? 'GET'} ${path}`;
    if (key in handlers) {
      const handler = handlers[key];
      const value = typeof handler === 'function' ? handler(opts) : handler;
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    }
    if (path === '/challenges/mine') return Promise.resolve([entry()]);
    return Promise.resolve(undefined);
  });
}

function renderStudio(
  entryUrl: string,
  element: ReactElement,
  path = '/learn/playground/:projectId',
) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path, element }], { initialEntries: [entryUrl] });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  wireApi();
  createGameProjectMock.mockReset().mockResolvedValue({ id: 'site-42' });
  getProjectMock.mockReset().mockResolvedValue({ id: 'site-42', kind: 'website' });
  useMeMock.mockReturnValue({
    data: { kind: 'kid', sub: 'kid-1', family_id: 'fam-1', age: 10 },
  });
  useDemoModeMock.mockReturnValue(null);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('challenge strip — what it shows', () => {
  it('names the edition and its window, all from the entry record', async () => {
    renderStudio(
      `/learn/playground/new?kind=website&challenge=${SLUG}`,
      <PlaygroundApp projectId="new" />,
    );

    expect(await screen.findByTestId('challenge-strip')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-strip-name')).toHaveTextContent(
      'Creative Code Challenge — Junior',
    );
    // Both dates come from the edition — the studio authors neither.
    expect(screen.getByTestId('challenge-strip-window')).toHaveTextContent(
      'Send in between 24 Aug 2026 and 31 Aug 2026',
    );
    expect(screen.getByTestId('challenge-strip-link')).toHaveAttribute(
      'href',
      `/learn/challenge/${SLUG}/submit`,
    );
    // §8.3: the two facts a child cannot otherwise discover.
    expect(screen.getByTestId('challenge-strip-facts')).toHaveTextContent(
      /saves by itself.*only the project you enter is the one judges see/i,
    );
  });

  it('a resumed session recovers the context from the PROJECT, not the URL', async () => {
    // No `?challenge=` anywhere — this is what a reload (or an open from My
    // Projects) looks like after `replaceState` threw the param away.
    getProjectMock.mockResolvedValue({
      id: 'site-42',
      kind: 'website',
      challenge_edition_id: 'ed_1',
    });
    renderStudio('/learn/playground/site-42', <PlaygroundApp projectId="site-42" />);

    expect(await screen.findByTestId('challenge-strip')).toBeInTheDocument();
  });

  it('an entry for a DIFFERENT edition never claims this project', async () => {
    getProjectMock.mockResolvedValue({
      id: 'site-42',
      kind: 'website',
      challenge_edition_id: 'ed_other',
    });
    renderStudio('/learn/playground/site-42', <PlaygroundApp projectId="site-42" />);

    await waitFor(() => expect(api).toHaveBeenCalledWith('/challenges/mine'));
    expect(screen.queryByTestId('challenge-strip')).not.toBeInTheDocument();
  });

  it('a failed /challenges/mine read renders nothing — never an error card', async () => {
    wireApi({ 'GET /challenges/mine': new Error('offline') });
    renderStudio(
      `/learn/playground/new?kind=website&challenge=${SLUG}`,
      <PlaygroundApp projectId="new" />,
    );

    await waitFor(() => expect(api).toHaveBeenCalledWith('/challenges/mine'));
    expect(screen.queryByTestId('challenge-strip')).not.toBeInTheDocument();
  });
});

describe('challenge strip — designating the entry', () => {
  // A resumed challenge project: the context is on the project row, exactly as it
  // is for a child who comes back the next day.
  beforeEach(() => {
    getProjectMock.mockResolvedValue({
      id: 'site-42',
      kind: 'website',
      challenge_edition_id: 'ed_1',
    });
  });

  it('designates this project and then says it is the entry', async () => {
    const puts: Array<{ path: string; body: unknown }> = [];
    const putPath = `/challenges/by-slug/${SLUG}/entries/entry_1/designated-project`;
    wireApi({
      [`PUT ${putPath}`]: (opts: ApiOpts) => {
        puts.push({ path: putPath, body: opts.body });
        return {
          entry_id: 'entry_1',
          designated_project_id: 'site-42',
          progress_state: 'building',
        };
      },
    });
    renderStudio('/learn/playground/site-42', <PlaygroundApp projectId="site-42" />);

    fireEvent.click(await screen.findByTestId('challenge-strip-designate'));

    await waitFor(() => expect(puts).toHaveLength(1));
    expect(puts[0]!.body).toEqual({ project_id: 'site-42' });
    expect(await screen.findByTestId('challenge-strip-designated')).toBeInTheDocument();
    expect(screen.queryByTestId('challenge-strip-designate')).not.toBeInTheDocument();
  });

  it('an already-designated project shows no designate control', async () => {
    wireApi({ 'GET /challenges/mine': [entry({ designated_project_id: 'site-42' })] });
    renderStudio('/learn/playground/site-42', <PlaygroundApp projectId="site-42" />);

    expect(await screen.findByTestId('challenge-strip-designated')).toBeInTheDocument();
    expect(screen.queryByTestId('challenge-strip-designate')).not.toBeInTheDocument();
  });

  it('a failed designate says so and keeps the strip usable', async () => {
    wireApi({
      [`PUT /challenges/by-slug/${SLUG}/entries/entry_1/designated-project`]: new Error('nope'),
    });
    renderStudio('/learn/playground/site-42', <PlaygroundApp projectId="site-42" />);

    fireEvent.click(await screen.findByTestId('challenge-strip-designate'));
    expect(await screen.findByTestId('challenge-strip-error')).toBeInTheDocument();
    expect(screen.getByTestId('challenge-strip-designate')).toBeInTheDocument();
  });
});

// ── The exclusion set, in full (§8.3) ───────────────────────────────────────
// Each of these mounts the SAME component with a `?challenge=` in the URL, i.e.
// the strongest possible provocation, and asserts the strip stays away.
describe('challenge strip — the exclusion set', () => {
  const CHALLENGE_URL = `/learn/playground/new?kind=website&challenge=${SLUG}`;

  it('is absent for CLASS work', async () => {
    renderStudio(`${CHALLENGE_URL}&class=class-9`, <PlaygroundApp projectId="new" />);
    await waitFor(() => expect(screen.queryByTestId('challenge-strip')).not.toBeInTheDocument());
    // The class create must not even ask — a class project is not an entry.
    expect(api).not.toHaveBeenCalledWith('/challenges/mine');
  });

  it('is absent for a TEACHER-PREP project', async () => {
    useMeMock.mockReturnValue({ data: { kind: 'user', sub: 'usr-1', role: 'teacher' } });
    renderStudio(
      CHALLENGE_URL,
      <PlaygroundApp projectId="new" prepClassId="class-9" embedded />,
    );
    await waitFor(() => expect(screen.queryByTestId('challenge-strip')).not.toBeInTheDocument());
    expect(api).not.toHaveBeenCalledWith('/challenges/mine');
  });

  it('is absent in the READ-ONLY teacher live view', async () => {
    useMeMock.mockReturnValue({ data: { kind: 'user', sub: 'usr-1', role: 'teacher' } });
    getProjectMock.mockResolvedValue({
      id: 'site-42',
      kind: 'website',
      challenge_edition_id: 'ed_1',
    });
    renderStudio(
      `/learn/playground/site-42?challenge=${SLUG}`,
      <PlaygroundApp projectId="site-42" readOnly />,
    );
    await waitFor(() => expect(screen.queryByTestId('challenge-strip')).not.toBeInTheDocument());
    expect(api).not.toHaveBeenCalledWith('/challenges/mine');
  });

  it('is absent in TRY-DEMO mode (the same component, no authenticated kid)', async () => {
    useMeMock.mockReturnValue({ data: undefined });
    useDemoModeMock.mockReturnValue({ lockedPrompt: 'a cookie shop website' });
    renderStudio(CHALLENGE_URL, <PlaygroundApp projectId="new" />);
    await waitFor(() => expect(screen.queryByTestId('challenge-strip')).not.toBeInTheDocument());
    expect(api).not.toHaveBeenCalledWith('/challenges/mine');
  });

  it('is absent for an ORDINARY personal project', async () => {
    getProjectMock.mockResolvedValue({ id: 'game-7', kind: 'game' });
    renderStudio('/learn/playground/game-7', <PlaygroundApp projectId="game-7" />);
    // The project load has settled and reported NO challenge context…
    await waitFor(() => expect(getProjectMock).toHaveBeenCalledWith('game-7'));
    // …so the strip never mounts and the entry list is never even asked for.
    expect(screen.queryByTestId('challenge-strip')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/challenges/mine');
  });
});

describe('challenge context is persisted at create time, not carried in the URL', () => {
  it('the create call carries the slug (replaceState discards the param)', async () => {
    renderStudio(
      `/learn/playground/new?kind=website&challenge=${SLUG}`,
      <PlaygroundApp projectId="new" />,
    );

    const box = screen.getByPlaceholderText("Describe a website and we'll build it…");
    fireEvent.change(box, { target: { value: 'a cookie shop website' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() =>
      expect(createGameProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'website', challengeSlug: SLUG }),
      ),
    );
  });

  it('a class create never carries a challenge slug', async () => {
    renderStudio(
      `/learn/playground/new?kind=website&challenge=${SLUG}&class=class-9`,
      <PlaygroundApp projectId="new" />,
    );

    const box = screen.getByPlaceholderText("Describe a website and we'll build it…");
    fireEvent.change(box, { target: { value: 'a class website' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() => expect(createGameProjectMock).toHaveBeenCalled());
    expect(createGameProjectMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ challengeSlug: expect.anything() }),
    );
  });

  it('an ordinary create sends no challenge field at all', async () => {
    renderStudio('/learn/playground/new?kind=website', <PlaygroundApp projectId="new" />);

    const box = screen.getByPlaceholderText("Describe a website and we'll build it…");
    fireEvent.change(box, { target: { value: 'a cookie shop website' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() =>
      expect(createGameProjectMock).toHaveBeenCalledWith({
        kidId: 'kid-1',
        familyId: 'fam-1',
        title: 'a cookie shop website',
        kind: 'website',
      }),
    );
  });
});
