// @vitest-environment jsdom
// Teacher EDITABLE prep-project studio (teacher-prep-projects — Stage 2). The page
// renders the SAME studio a kid uses, EDITABLE, per project kind. This test mocks
// the three heavy studio components (they own Monaco / Phaser / sockets + have their
// own editable/readOnly tests) and asserts the PAGE wiring: it loads GET /projects/:id,
// renders the right studio EDITABLE (`readOnly` falsy) + `embedded` (so the studio's
// own `/learn/*` home link is suppressed) per kind, shows the honest message for an
// unsupported (creative) kind, shows the friendly owner-scope error on a 403/404, and
// its Back closes the tab. FE-only — `api` is mocked (no network).

import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock('@/lib/api', async (orig) => {
  const actual = await orig<typeof import('@/lib/api')>();
  return { ...actual, api: apiMock };
});

// Mock the three studios — assert the page picks the right one, EDITABLE + embedded.
// Each stub records its props so we can assert `readOnly`, `embedded` + `projectId`.
const gameMounts = vi.fn();
const codeMounts = vi.fn();
const blocksMounts = vi.fn();
vi.mock('../learn/playground/PlaygroundApp', () => ({
  PlaygroundApp: (props: {
    projectId?: string;
    readOnly?: boolean;
    embedded?: boolean;
    prepClassId?: string;
  }) => {
    gameMounts(props);
    return (
      <div
        data-testid="stub-game"
        data-readonly={String(props.readOnly)}
        data-embedded={String(props.embedded)}
        data-pid={props.projectId}
        data-prep-class={String(props.prepClassId)}
      />
    );
  },
}));
vi.mock('../learn/code/CodeStudioPage', () => ({
  CodeStudioPage: (props: { projectId?: string; readOnly?: boolean; embedded?: boolean }) => {
    codeMounts(props);
    return (
      <div
        data-testid="stub-code"
        data-readonly={String(props.readOnly)}
        data-embedded={String(props.embedded)}
        data-pid={props.projectId}
      />
    );
  },
}));
vi.mock('../learn/blocks/BlocksStudioPage', () => ({
  BlocksStudioPage: (props: { projectId?: string; readOnly?: boolean; embedded?: boolean }) => {
    blocksMounts(props);
    return (
      <div
        data-testid="stub-blocks"
        data-readonly={String(props.readOnly)}
        data-embedded={String(props.embedded)}
        data-pid={props.projectId}
      />
    );
  },
}));

import { ApiError } from '@/lib/api';
import { TeacherPrepStudioPage } from './TeacherPrepStudioPage';

function renderPrep() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/teacher/prep/proj_1']}>
        <Routes>
          <Route path="/teacher/prep/:projectId" element={<TeacherPrepStudioPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMock.mockReset();
  gameMounts.mockReset();
  codeMounts.mockReset();
  blocksMounts.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TeacherPrepStudioPage', () => {
  it('renders the GAME studio EDITABLE with the "Teacher prep · editable" banner', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'Space Cat', kind: 'game' });

    renderPrep();

    const stub = await screen.findByTestId('stub-game');
    // Editable: readOnly is not set (falsy default), so the studio is the kid default.
    expect(stub).toHaveAttribute('data-readonly', 'undefined');
    expect(stub).toHaveAttribute('data-pid', 'proj_1');
    // The prep banner is present + distinct (editable, not read-only/live).
    const banner = screen.getByTestId('teacher-prep-banner');
    expect(banner).toHaveTextContent(/teacher prep/i);
    expect(banner).toHaveTextContent(/editable/i);
    expect(banner).not.toHaveTextContent(/read-only/i);
    expect(screen.getByTestId('teacher-prep-title')).toHaveTextContent('Space Cat');
  });

  it('renders the CODE studio EDITABLE + embedded (home link suppressed)', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'My site', kind: 'code' });

    renderPrep();

    const stub = await screen.findByTestId('stub-code');
    expect(stub).toHaveAttribute('data-readonly', 'undefined');
    expect(stub).toHaveAttribute('data-embedded', 'true');
    expect(stub).toHaveAttribute('data-pid', 'proj_1');
  });

  it('renders the BLOCKS studio EDITABLE + embedded (home link suppressed)', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'My blocks', kind: 'blocks' });

    renderPrep();

    const stub = await screen.findByTestId('stub-blocks');
    expect(stub).toHaveAttribute('data-readonly', 'undefined');
    expect(stub).toHaveAttribute('data-embedded', 'true');
    expect(stub).toHaveAttribute('data-pid', 'proj_1');
  });

  it('Back closes the tab when opened fresh (no in-app history)', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'My Game', kind: 'game' });
    const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    renderPrep();
    await screen.findByTestId('stub-game');
    fireEvent.click(screen.getByRole('button', { name: /back to prep/i }));
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('shows the honest message for an unsupported (creative) kind and renders no studio', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'My art', kind: 'creative' });

    renderPrep();

    expect(await screen.findByTestId('teacher-prep-unsupported')).toHaveTextContent(
      /isn’t available for this project type yet/i,
    );
    expect(gameMounts).not.toHaveBeenCalled();
    expect(codeMounts).not.toHaveBeenCalled();
    expect(blocksMounts).not.toHaveBeenCalled();
  });

  it('shows the friendly owner-scope error on a 403', async () => {
    apiMock.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'forbidden'));

    renderPrep();

    expect(await screen.findByTestId('teacher-prep-error')).toHaveTextContent(
      /only edit prep projects you own/i,
    );
  });

  it('shows the friendly owner-scope error on a 404', async () => {
    apiMock.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'not found'));

    renderPrep();

    expect(await screen.findByTestId('teacher-prep-error')).toHaveTextContent(
      /only edit prep projects you own/i,
    );
  });

  // Prompt-first NEW game (parity with the kid Creative Code Studio): `/teacher/prep/new`
  // lands on the game studio's prompt with `prepClassId` from `?class=` — and does
  // NOT fetch GET /projects/new (no project exists yet; it's created on prompt submit).
  //
  // Wrapped in StrictMode ON PURPOSE: the create-on-mount (blocks/code) effect must be
  // StrictMode-safe (mount→cleanup→mount). A regression to the `alive`-flag pattern
  // would swallow the resolved create and hang on "Creating…" — this render catches it.
  function renderPrepNew(entry: string) {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <StrictMode>
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={[entry]}>
            <Routes>
              <Route path="/teacher/prep/:projectId" element={<TeacherPrepStudioPage />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      </StrictMode>,
    );
  }

  it('NEW route lands on the game studio prompt-first without fetching a project', async () => {
    renderPrepNew('/teacher/prep/new?class=c1');

    const stub = await screen.findByTestId('stub-game');
    expect(stub).toHaveAttribute('data-pid', 'new');
    expect(stub).toHaveAttribute('data-prep-class', 'c1');
    expect(stub).toHaveAttribute('data-readonly', 'undefined'); // editable
    expect(stub).toHaveAttribute('data-embedded', 'true');
    // No project exists yet → the meta fetch must NOT run.
    expect(apiMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('teacher-prep-banner')).toHaveTextContent(/editable/i);
  });

  it('NEW route without a class shows an honest error (no studio)', async () => {
    renderPrepNew('/teacher/prep/new');

    expect(await screen.findByTestId('teacher-prep-new-error')).toHaveTextContent(/missing its class/i);
    expect(gameMounts).not.toHaveBeenCalled();
    expect(apiMock).not.toHaveBeenCalled();
  });

  // Blocks / Web Code create-then-open: creation happens HERE in the app (POST
  // /classes/:id/prep-projects) — never in teacher-console — then the studio mounts on
  // the created id. This is what avoids the cross-tab session race that closed the tab.
  it('NEW route kind=blocks creates in the app, then mounts the Blocks studio', async () => {
    apiMock.mockResolvedValue({ id: 'prep_blk_1' });
    renderPrepNew('/teacher/prep/new?class=c1&kind=blocks');

    const stub = await screen.findByTestId('stub-blocks');
    expect(stub).toHaveAttribute('data-pid', 'prep_blk_1');
    expect(stub).toHaveAttribute('data-embedded', 'true');
    expect(apiMock).toHaveBeenCalledWith(
      '/classes/c1/prep-projects',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ kind: 'blocks', template: 'blocks_blank' }),
      }),
    );
  });

  it('NEW route kind=code creates in the app, then mounts the Code studio', async () => {
    apiMock.mockResolvedValue({ id: 'prep_code_1' });
    renderPrepNew('/teacher/prep/new?class=c1&kind=code');

    const stub = await screen.findByTestId('stub-code');
    expect(stub).toHaveAttribute('data-pid', 'prep_code_1');
    expect(stub).toHaveAttribute('data-embedded', 'true');
    expect(apiMock).toHaveBeenCalledWith(
      '/classes/c1/prep-projects',
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({ kind: 'code', template: 'blank' }),
      }),
    );
  });

  it('NEW route create failure (403) shows an honest error, no studio', async () => {
    apiMock.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'forbidden'));
    renderPrepNew('/teacher/prep/new?class=c1&kind=blocks');

    expect(await screen.findByTestId('teacher-prep-new-error')).toBeInTheDocument();
    expect(blocksMounts).not.toHaveBeenCalled();
  });
});
