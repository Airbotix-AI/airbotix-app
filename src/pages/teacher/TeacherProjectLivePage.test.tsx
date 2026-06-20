// @vitest-environment jsdom
// Teacher read-only LIVE project viewer (teacher-live-project-view-prd, D-LV-6).
// The viewer renders the kid's STUDIO EDITOR read-only per kind. This test mocks
// the three heavy studio components (they own Monaco / Phaser / sockets and have
// their own readOnly tests) and asserts the PAGE wiring: it loads GET /projects/:id,
// renders the right studio with `readOnly` + the projectId per kind, REMOUNTS the
// studio on a `project.vfs.changed` for this project (live), shows the honest
// message for an unsupported (creative) kind, and the friendly 403 class-scope
// error. FE-only — `api` and the WS subscription are mocked (no network / socket).

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock, onWsEventMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  onWsEventMock: vi.fn(),
}));

vi.mock('@/lib/api', async (orig) => {
  const actual = await orig<typeof import('@/lib/api')>();
  return { ...actual, api: apiMock };
});
// Capture the `project.vfs.changed` handler so a test can fire a live event.
vi.mock('@/lib/ws', () => ({
  onWsEvent: onWsEventMock,
  getSocket: vi.fn(),
  closeSocket: vi.fn(),
  sendWsEvent: vi.fn(),
}));

// Mock the three studios — assert the page picks the right one in readOnly mode.
// Each stub records its props so we can assert `readOnly` + `projectId` and count
// mounts (the page remounts the studio on a live VFS change).
const gameMounts = vi.fn();
const codeMounts = vi.fn();
const blocksMounts = vi.fn();
vi.mock('../learn/playground/PlaygroundApp', () => ({
  PlaygroundApp: (props: { projectId?: string; readOnly?: boolean }) => {
    gameMounts(props);
    return <div data-testid="stub-game" data-readonly={String(props.readOnly)} data-pid={props.projectId} />;
  },
}));
vi.mock('../learn/code/CodeStudioPage', () => ({
  CodeStudioPage: (props: { projectId?: string; readOnly?: boolean }) => {
    codeMounts(props);
    return <div data-testid="stub-code" data-readonly={String(props.readOnly)} data-pid={props.projectId} />;
  },
}));
vi.mock('../learn/blocks/BlocksStudioPage', () => ({
  BlocksStudioPage: (props: { projectId?: string; readOnly?: boolean }) => {
    blocksMounts(props);
    return <div data-testid="stub-blocks" data-readonly={String(props.readOnly)} data-pid={props.projectId} />;
  },
}));

import { ApiError } from '@/lib/api';
import { TeacherProjectLivePage } from './TeacherProjectLivePage';

let vfsHandler: ((p: unknown) => void) | null = null;

function renderViewer() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/teacher/projects/proj_1/live']}>
        <Routes>
          <Route path="/teacher/projects/:projectId/live" element={<TeacherProjectLivePage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiMock.mockReset();
  onWsEventMock.mockReset();
  gameMounts.mockReset();
  codeMounts.mockReset();
  blocksMounts.mockReset();
  vfsHandler = null;
  onWsEventMock.mockImplementation((event: string, handler: (p: unknown) => void) => {
    if (event === 'project.vfs.changed') vfsHandler = handler;
    return () => undefined;
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TeacherProjectLivePage', () => {
  it('renders the GAME studio in read-only with the kid nickname header', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'Space Cat', kind: 'game', kid_nickname: 'Mia' });

    renderViewer();

    const stub = await screen.findByTestId('stub-game');
    expect(stub).toHaveAttribute('data-readonly', 'true');
    expect(stub).toHaveAttribute('data-pid', 'proj_1');
    expect(screen.getByText('Space Cat')).toBeInTheDocument();
    // Style B banner: "You're watching <kid>'s project — <title>" + Live + Read-only.
    const banner = screen.getByTestId('teacher-live-banner');
    expect(banner).toHaveTextContent('Mia');
    expect(screen.getByTestId('teacher-live-owner')).toHaveTextContent('Mia');
    expect(banner).toHaveTextContent(/live/i);
    expect(banner).toHaveTextContent(/read-only/i);
  });

  it('renders the CODE studio in read-only for a code project', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'My site', kind: 'code', kid_nickname: 'Leo' });

    renderViewer();

    const stub = await screen.findByTestId('stub-code');
    expect(stub).toHaveAttribute('data-readonly', 'true');
    expect(stub).toHaveAttribute('data-pid', 'proj_1');
  });

  it('renders the BLOCKS studio in read-only for a blocks project', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'My blocks', kind: 'blocks', kid_nickname: 'Leo' });

    renderViewer();

    const stub = await screen.findByTestId('stub-blocks');
    expect(stub).toHaveAttribute('data-readonly', 'true');
    expect(stub).toHaveAttribute('data-pid', 'proj_1');
  });

  it('remounts the studio when a project.vfs.changed event fires for this project', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'Space Cat', kind: 'game', kid_nickname: 'Mia' });

    renderViewer();
    await screen.findByTestId('stub-game');
    expect(gameMounts).toHaveBeenCalledTimes(1);

    // A live edit on THIS project → the studio remounts (re-loads the VFS).
    await act(async () => {
      vfsHandler?.({ project_id: 'proj_1', kid_id: 'k1', kind: 'game', version: 2 });
    });
    await waitFor(() => expect(gameMounts.mock.calls.length).toBeGreaterThanOrEqual(2));
    const remounts = gameMounts.mock.calls.length;

    // An event for a DIFFERENT project is ignored (no extra remount).
    await act(async () => {
      vfsHandler?.({ project_id: 'other', kid_id: 'k1', kind: 'game', version: 3 });
    });
    expect(gameMounts.mock.calls.length).toBe(remounts);
  });

  it('shows the honest message for an unsupported (creative) kind and renders no studio', async () => {
    apiMock.mockResolvedValue({ id: 'proj_1', title: 'My art', kind: 'creative', kid_nickname: 'Mia' });

    renderViewer();

    expect(await screen.findByTestId('teacher-live-unsupported')).toHaveTextContent(
      /isn’t available for this project type yet/i,
    );
    expect(gameMounts).not.toHaveBeenCalled();
    expect(codeMounts).not.toHaveBeenCalled();
    expect(blocksMounts).not.toHaveBeenCalled();
  });

  it('shows the friendly class-scope error on a 403 (D-LV-5)', async () => {
    apiMock.mockRejectedValue(new ApiError(403, 'FORBIDDEN', 'forbidden'));

    renderViewer();

    expect(await screen.findByTestId('teacher-live-error')).toHaveTextContent(
      /only watch projects from a class you teach/i,
    );
  });
});
