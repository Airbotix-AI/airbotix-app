// @vitest-environment jsdom
// Teacher live read-only viewer for the GAME studio (teacher-live-project-view-prd
// D-LV-6). The mirror of CodeStudioPage.readOnly.test for the playground:
//
//   1. A teacher is a `user` principal (no family) — the kid-only wallet AND class
//      queries NEVER fire, and the tree renders without crashing. This is the real
//      teacher use case (the game hook's own tests only cover the `code`/stub path).
//   2. The game editor surface is genuinely read-only: Monaco is non-editable
//      (`readOnly: true`), the FileTree CRUD buttons are absent + its rows are not
//      draggable, and NO save/persist request is issued on mount (the no-autosave
//      proof, equivalent to the blocks studio's blocks-no-autosave test).
//
// Kid mode (readOnly absent) is asserted alongside at the Workspace boundary — the
// editor edits and the wallet/class queries fire — so a regression to the kid path
// is caught.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, RouterProvider, createMemoryRouter } from 'react-router-dom';
// MemoryRouter renders the Workspace-level kid test; createMemoryRouter (a data
// router) is required by PlaygroundApp's useBlocker in the teacher test.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { readVfsMock, getProjectMock, apiMock, useMeMock, saveProjectMock, monacoSeen } =
  vi.hoisted(() => ({
    readVfsMock: vi.fn(),
    getProjectMock: vi.fn(),
    apiMock: vi.fn(),
    useMeMock: vi.fn(),
    saveProjectMock: vi.fn(),
    // Records the `readOnly` prop every MonacoEditor render receives.
    monacoSeen: [] as Array<boolean | undefined>,
  }));

vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));
vi.mock('@/lib/api', async (orig) => {
  const actual = await orig<typeof import('@/lib/api')>();
  return { ...actual, api: apiMock };
});
vi.mock('../code/codeApi', async (orig) => {
  const actual = await orig<typeof import('../code/codeApi')>();
  return { ...actual, readVfs: readVfsMock, getProject: getProjectMock };
});
// The persist funnel PlaygroundApp uses for autosave/exit. Spying here proves the
// teacher viewer never writes (no PUT to the kid's project) on mount.
vi.mock('./projectPersistence', async (orig) => {
  const actual = await orig<typeof import('./projectPersistence')>();
  return { ...actual, saveProject: saveProjectMock };
});
// Monaco is a lazy ~MB chunk that won't render in jsdom — stub it with a textarea
// that mirrors the real prop contract (`readOnly` + `onChange`), so we can assert
// non-editability.
vi.mock('./panes/MonacoEditor', () => ({
  default: ({
    value,
    onChange,
    readOnly,
  }: {
    value: string;
    onChange: (v: string) => void;
    readOnly?: boolean;
  }) => {
    monacoSeen.push(readOnly);
    return (
      <textarea
        data-testid="monaco-stub"
        readOnly={readOnly}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  },
}));

import { PlaygroundApp } from './PlaygroundApp';
import { Workspace } from './Workspace';
import { useProjectStore } from './projectStore';
import { usePlaygroundStore } from './playgroundStore';
import { writeWorkspaceSlice } from './workspaceUiStore';
import type { VfsFile } from '../code/codeApi';

const file = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const VFS = [file('main.js', 'console.log("hi")')];

beforeEach(() => {
  monacoSeen.length = 0;
  readVfsMock.mockReset().mockResolvedValue(VFS);
  getProjectMock.mockReset().mockResolvedValue({ id: 'g1', title: 'My Game', learning_context: null });
  apiMock.mockReset().mockResolvedValue({ stars_balance: 7 });
  saveProjectMock.mockReset().mockResolvedValue({ status: 'saved', version: 1 });
  // The Game Runner stage + tab strips use a ResizeObserver jsdom doesn't have.
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  // CodeEditorPane scrolls the active tab into view; jsdom has no scrollIntoView.
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
  // Reset the shared VFS store between renders (it's a singleton).
  useProjectStore.getState().setFiles([]);
  // The Code editor (+ Monaco / FileTree) only renders when its pane is visible.
  // Use the SPLIT layout with the Code tab active so the editor mounts on render
  // (in Window layout the Code window is closed by default → not rendered).
  usePlaygroundStore.getState().setLayoutMode('split');
  writeWorkspaceSlice('split', { tab: 'code' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PlaygroundApp read-only (teacher game viewer, D-LV-6)', () => {
  it('a teacher (user principal) renders without crashing and never persists or fires the kid-only wallet/class queries', async () => {
    // A teacher is a `user` principal — no family, no kid id.
    useMeMock.mockReturnValue({ data: { kind: 'user', sub: 't1', role: 'teacher', family_id: null } });

    // PlaygroundApp uses `useBlocker`, which requires a data router; Workspace uses
    // TanStack Query (the wallet/class queries), which needs a QueryClientProvider.
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const router = createMemoryRouter(
      [
        {
          path: '/',
          element: (
            <QueryClientProvider client={qc}>
              <PlaygroundApp projectId="g1" readOnly />
            </QueryClientProvider>
          ),
        },
      ],
      { initialEntries: ['/'] },
    );
    render(<RouterProvider router={router} />);

    // The workspace mounts straight from the loaded VFS (no landing/generating flow).
    const monaco = (await screen.findByTestId(
      'monaco-stub',
      undefined,
      { timeout: 10_000 },
    )) as HTMLTextAreaElement;
    // Monaco is non-editable in the viewer.
    expect(monaco).toHaveAttribute('readonly');
    expect(monacoSeen.length).toBeGreaterThan(0);
    expect(monacoSeen.every((ro) => ro === true)).toBe(true);

    // FileTree CRUD affordances are absent, and the file row is NOT draggable.
    expect(screen.queryByLabelText('New file')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New folder')).not.toBeInTheDocument();
    const row = document.querySelector('[data-path="main.js"]');
    expect(row).not.toBeNull();
    expect(row).toHaveAttribute('draggable', 'false');

    // The kid-only wallet AND class-roster queries are derived from a kid principal,
    // which a teacher is not — neither endpoint is ever hit.
    expect(apiMock).not.toHaveBeenCalledWith(expect.stringContaining('/wallet'));
    expect(apiMock).not.toHaveBeenCalledWith('/classes/mine');

    // No persist request is issued on mount — the teacher's view must never write.
    // Give any debounced autosave a chance to (not) fire.
    await new Promise((r) => setTimeout(r, 50));
    expect(saveProjectMock).not.toHaveBeenCalled();
  });
});

describe('Workspace kid mode is unchanged (no read-only regression)', () => {
  function renderWorkspace() {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <Workspace
            files={VFS}
            runKey={0}
            running={false}
            onApplyFiles={vi.fn()}
            onRun={vi.fn()}
            prompt=""
            projectId="g1"
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('a kid: Monaco editable, FileTree CRUD present + rows draggable, wallet/class queries fire', async () => {
    // A kid principal — the wallet + class queries run, the editor edits.
    useMeMock.mockReturnValue({ data: { kind: 'kid', sub: 'k1', age: 10, family_id: 'fam1' } });

    renderWorkspace();

    const monaco = (await screen.findByTestId('monaco-stub')) as HTMLTextAreaElement;
    expect(monaco).not.toHaveAttribute('readonly');
    expect(monacoSeen.length).toBeGreaterThan(0);
    expect(monacoSeen.every((ro) => !ro)).toBe(true);

    // FileTree CRUD is present + the row is draggable for the kid.
    expect(screen.getByLabelText('New file')).toBeInTheDocument();
    const row = document.querySelector('[data-path="main.js"]');
    expect(row).toHaveAttribute('draggable', 'true');

    // The kid-only wallet + class-roster queries fire (real path).
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/families/fam1/wallet'));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/classes/mine'));
  });

  it('a kid: playground chat image attachment controls are hidden while disabled', async () => {
    useMeMock.mockReturnValue({ data: { kind: 'kid', sub: 'k1', age: 10, family_id: 'fam1' } });

    renderWorkspace();

    fireEvent.click(screen.getByRole('tab', { name: /Chat/ }));

    expect(await screen.findByTestId('chat-input')).toBeInTheDocument();
    expect(screen.queryByTestId('chat-attach-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chat-attach-input')).not.toBeInTheDocument();
  });
});
