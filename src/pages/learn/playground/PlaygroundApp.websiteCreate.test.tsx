// @vitest-environment jsdom
// Website Studio create flow (creative-code-studio-website-prd):
// `/learn/playground/new?kind=website` arms the SAME prompt-first landing with
// website copy — the EXACT placeholder "Describe a website and we'll build it…"
// is a harness journey contract — and the submitted prompt creates a
// `kind:'website'` backend project (default template `website_blank` server-
// side). The class flow attaches the created site exactly like a game.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createGameProjectMock,
  placeGameProjectForClassMock,
  getProjectMock,
  useMeMock,
} = vi.hoisted(() => ({
  createGameProjectMock: vi.fn(),
  placeGameProjectForClassMock: vi.fn(),
  getProjectMock: vi.fn(),
  useMeMock: vi.fn(),
}));

vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));
vi.mock('../code/codeApi', async (orig) => {
  const actual = await orig<typeof import('../code/codeApi')>();
  return { ...actual, getProject: getProjectMock };
});
vi.mock('./panes/playgroundApi', async (orig) => {
  const actual = await orig<typeof import('./panes/playgroundApi')>();
  return {
    ...actual,
    createGameProject: createGameProjectMock,
    placeGameProjectForClass: placeGameProjectForClassMock,
  };
});
// The REAL LandingScreen renders (its website copy is under test); only the
// generating phase is stubbed so no stream/backends run.
vi.mock('./GeneratingScreen', () => ({
  GeneratingScreen: ({ projectId }: { projectId?: string }) => (
    <div data-testid="generating-project">{projectId}</div>
  ),
}));

import { PlaygroundApp } from './PlaygroundApp';

function renderNew(entry: string) {
  const router = createMemoryRouter(
    [{ path: '/learn/playground/:projectId', element: <PlaygroundApp projectId="new" /> }],
    { initialEntries: [entry] },
  );
  return render(<RouterProvider router={router} />);
}

describe('PlaygroundApp website create flow (?kind=website)', () => {
  beforeEach(() => {
    createGameProjectMock.mockReset().mockResolvedValue({ id: 'site-42' });
    placeGameProjectForClassMock.mockReset().mockResolvedValue(undefined);
    getProjectMock.mockReset().mockResolvedValue({ id: 'site-42', kind: 'website' });
    useMeMock.mockReturnValue({ data: { kind: 'kid', sub: 'kid-1', family_id: 'fam-1', age: 10 } });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("lands on the website prompt — EXACT placeholder + site starter chips (harness contract)", () => {
    renderNew('/learn/playground/new?kind=website');
    // ⚠️ Load-bearing: the harness journey targets this placeholder verbatim.
    expect(
      screen.getByPlaceholderText("Describe a website and we'll build it…"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Cookie shop/)).toBeInTheDocument();
    expect(screen.queryByText('Pong')).not.toBeInTheDocument();
  });

  it("creates a kind:'website' project from the prompt and moves to generating", async () => {
    renderNew('/learn/playground/new?kind=website');

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
    await expect(screen.findByTestId('generating-project')).resolves.toHaveTextContent('site-42');
  });

  it('the class create flow attaches the created website to the source class', async () => {
    renderNew('/learn/playground/new?kind=website&class=class-9');

    const box = screen.getByPlaceholderText("Describe a website and we'll build it…");
    fireEvent.change(box, { target: { value: 'a pet adoption website' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() =>
      expect(placeGameProjectForClassMock).toHaveBeenCalledWith({
        projectId: 'site-42',
        classId: 'class-9',
      }),
    );
    expect(createGameProjectMock).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'website' }),
    );
  });

  it('without ?kind the landing stays the game prompt (no regression)', () => {
    renderNew('/learn/playground/new');
    expect(
      screen.getByPlaceholderText("Describe a game or website and we'll build it…"),
    ).toBeInTheDocument();
    expect(screen.getByText('Pong')).toBeInTheDocument();
  });

  // D-WEB-11: the GENERIC landing (Learn-home tile → /learn/playground/new, no
  // ?kind) infers WEBSITE from a confident prompt signal — this exact prompt used
  // to create a game and confuse the first build.
  it('generic landing + a website-shaped idea creates a website (kind inference)', async () => {
    renderNew('/learn/playground/new');

    const box = screen.getByPlaceholderText("Describe a game or website and we'll build it…");
    fireEvent.change(box, { target: { value: "I'd like to create a todo list website" } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() =>
      expect(createGameProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "I'd like to create a todo list website",
          kind: 'website',
        }),
      ),
    );
  });

  it('generic landing + a game idea still creates a game (no kind field sent)', async () => {
    renderNew('/learn/playground/new');

    const box = screen.getByPlaceholderText("Describe a game or website and we'll build it…");
    fireEvent.change(box, { target: { value: 'a pong game' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() => expect(createGameProjectMock).toHaveBeenCalled());
    expect(createGameProjectMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'website' }),
    );
  });

  it('an EXPLICIT ?kind=website never falls back to game, even for a game-y prompt', async () => {
    renderNew('/learn/playground/new?kind=website');

    const box = screen.getByPlaceholderText("Describe a website and we'll build it…");
    fireEvent.change(box, { target: { value: 'a pong game' } });
    fireEvent.keyDown(box, { key: 'Enter' });

    await waitFor(() =>
      expect(createGameProjectMock).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'website' }),
      ),
    );
  });
});
