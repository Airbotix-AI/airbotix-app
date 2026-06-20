// @vitest-environment jsdom
// Teacher live read-only viewer (teacher-live-project-view-prd D-LV-6): the Code
// Studio renders the kid's editor (FileTree / chat history / PreviewFrame) from a
// mocked VFS, but the chat COMPOSER and approve/reject controls are absent (a
// teacher can't type, send, or approve a turn) and the kid-only WALLET query is
// SKIPPED for a teacher (`user`) principal — no crash, balance hidden. Kid mode
// stays unchanged (the composer renders, the wallet loads).

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getProjectMock, readVfsMock, runAgentTurnMock, apiMock, useMeMock } = vi.hoisted(() => ({
  getProjectMock: vi.fn(),
  readVfsMock: vi.fn(),
  runAgentTurnMock: vi.fn(),
  apiMock: vi.fn(),
  useMeMock: vi.fn(),
}));

vi.mock('./codeApi', async (orig) => {
  const actual = await orig<typeof import('./codeApi')>();
  return {
    ...actual,
    getProject: getProjectMock,
    readVfs: readVfsMock,
    runAgentTurn: runAgentTurnMock,
  };
});
vi.mock('@/lib/api', async (orig) => {
  const actual = await orig<typeof import('@/lib/api')>();
  return { ...actual, api: apiMock };
});
vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));
// PreviewFrame renders an <iframe srcDoc> with a real DOM build; stub it so the
// test stays focused on the read-only editor chrome (its own tests cover it).
vi.mock('./PreviewFrame', () => ({
  PreviewFrame: () => <div data-testid="preview-frame" />,
}));

import { CodeStudioPage } from './CodeStudioPage';
import type { VfsFile } from './codeApi';

const file = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

function renderStudio(readOnly: boolean) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CodeStudioPage projectId="p1" readOnly={readOnly} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  getProjectMock.mockReset().mockResolvedValue({ id: 'p1', title: 'My Site', visibility: 'private' });
  readVfsMock.mockReset().mockResolvedValue([file('index.html', '<h1>hi</h1>')]);
  runAgentTurnMock.mockReset();
  apiMock.mockReset().mockResolvedValue({ stars_balance: 12 });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CodeStudioPage read-only (teacher viewer)', () => {
  it('renders the editor (file tree + preview) but hides the chat composer + approve controls', async () => {
    // A teacher is a `user` principal — no family/wallet.
    useMeMock.mockReturnValue({ data: { kind: 'user', sub: 't1', role: 'teacher', family_id: null } });

    renderStudio(true);

    // The editor layout renders (preview from the VFS + the studio header).
    expect(await screen.findByTestId('preview-frame')).toBeInTheDocument();
    expect(screen.getByText('My Site')).toBeInTheDocument();
    // ▶ Run anew stays enabled (non-destructive viewing).
    expect(screen.getByRole('button', { name: /Run anew/i })).toBeInTheDocument();

    // No composer: a teacher cannot type or send a turn.
    expect(screen.queryByPlaceholderText(/want to build/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ask −/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Read-only — watching the student build/i)).toBeInTheDocument();

    // The kid-only wallet query is skipped for a teacher → the wallet endpoint is
    // never hit (other reads like the project back-link may run; the wallet must not).
    expect(apiMock).not.toHaveBeenCalledWith(expect.stringContaining('/wallet'));
    // No balance is shown (no "★ left" chip).
    expect(screen.queryByText(/★ left/)).not.toBeInTheDocument();
  });

  it('kid mode is unchanged: the composer renders and the wallet loads', async () => {
    // A kid principal — the wallet query runs.
    useMeMock.mockReturnValue({ data: { kind: 'kid', sub: 'k1', age: 14, family_id: 'fam1' } });

    renderStudio(false);

    expect(await screen.findByText('index.html')).toBeInTheDocument();
    // The composer is present for the kid.
    expect(screen.getByPlaceholderText(/want to build/i)).toBeInTheDocument();
    // The kid-only wallet query fires (family wallet endpoint).
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith('/families/fam1/wallet'));
  });
});
