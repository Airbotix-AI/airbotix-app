// @vitest-environment jsdom
// The Database window (Website Studio, creative-code-studio-website-prd — the
// project's server-side db, D-WEB-15): a 7th
// playground window (id 'db') that exists ONLY for kind='website' — desktop
// tile + floating window (window mode) and a "Database" tab (split mode). A
// GAME project must stay byte-identical: no tile, no tab, no pane — even if a
// stale persisted layout left the db window open. Journey contract: the opener
// is a role=button with accessible name "Database"; the pane is `site-db-pane`.
//
// D-WEB-16: the code editor's explorer shows a VIRTUAL `database.sqlite` entry
// (`explorer-database-file`, websites only) whose click rides the SAME seam the
// dock tile uses — open+focus the db window (window mode) / switch to the
// Database tab (split mode) — never opening a text tab.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiMock, useMeMock } = vi.hoisted(() => ({
  apiMock: vi.fn(),
  useMeMock: vi.fn(),
}));

vi.mock('@/auth/useAuth', () => ({ useMe: useMeMock }));
vi.mock('@/lib/api', async (orig) => {
  const actual = await orig<typeof import('@/lib/api')>();
  return { ...actual, api: apiMock };
});
// Opening the Code Editor window mounts the (heavy, lazily-loaded) Monaco
// chunk — stub it, these tests only exercise the explorer tree.
vi.mock('./panes/MonacoEditor', () => ({ default: () => null }));
vi.mock('./panes/HistoryDiff', () => ({ default: () => null }));

import { Workspace } from './Workspace';
import { defaultWindows, usePlaygroundStore, type PlaygroundSnapshot } from './playgroundStore';
import { useProjectStore } from './projectStore';
import { useSiteDbStore } from './siteDbStore';
import { useWorkspaceUiStore } from './workspaceUiStore';
import type { VfsFile } from '../code/codeApi';

const file = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const SITE_VFS = [
  file('index.html', '<h1>Pets</h1>'),
  file('server.js', "app.get('/api/pets', (req, res) => res.json(db.pets));"),
  file('data/pets.json', '[]'),
];
const GAME_VFS = [file('main.js', 'new Phaser.Game({})')];

function renderWorkspace(kind: 'game' | 'website') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Workspace
          files={kind === 'website' ? SITE_VFS : GAME_VFS}
          runKey={0}
          running={false}
          kind={kind}
          onApplyFiles={vi.fn()}
          onRun={vi.fn()}
          prompt=""
          projectId="p1"
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  useMeMock.mockReturnValue({ data: { kind: 'kid', sub: 'k1', age: 10, family_id: 'fam1' } });
  apiMock.mockReset().mockResolvedValue({ stars_balance: 7 });
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};
  // Singleton stores — start every test from a clean slate.
  useProjectStore.getState().setFiles([]);
  useWorkspaceUiStore.getState().restore(null);
  useSiteDbStore.setState({ tables: null, updatedAt: null, error: false });
  usePlaygroundStore.setState({
    windows: defaultWindows(),
    topZ: 4,
    layoutMode: 'window',
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Workspace — Database window (window mode)', () => {
  it('website: the Database desktop tile opens the db window (site-db-pane)', () => {
    renderWorkspace('website');

    // The dock opener — journey contract: role button, accessible name "Database".
    const tile = screen.getByRole('button', { name: 'Database' });
    expect(screen.queryByTestId('site-db-pane')).not.toBeInTheDocument(); // closed by default

    fireEvent.click(tile);
    expect(screen.getByTestId('site-db-pane')).toBeInTheDocument();
  });

  it('game: NO Database tile, window, or taskbar button — even with a stale-open db window', () => {
    // A stale persisted layout could carry windows.db.open=true into a game.
    usePlaygroundStore.setState((s) => ({
      windows: { ...s.windows, db: { ...s.windows.db, open: true } },
    }));
    renderWorkspace('game');

    expect(screen.queryByRole('button', { name: 'Database' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('site-db-pane')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Database/ })).not.toBeInTheDocument();
  });
});

describe('Workspace — Database tab (split mode)', () => {
  beforeEach(() => {
    usePlaygroundStore.getState().setLayoutMode('split');
  });

  it('website: a "Database" tab renders the pane', () => {
    renderWorkspace('website');
    fireEvent.click(screen.getByRole('tab', { name: 'Database' }));
    expect(screen.getByTestId('site-db-pane')).toBeInTheDocument();
  });

  it('game: no Database tab; a stale-persisted db tab falls back to Chat', () => {
    useWorkspaceUiStore.getState().setSlice('split', { tab: 'db' });
    renderWorkspace('game');
    expect(screen.queryByRole('tab', { name: 'Database' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('site-db-pane')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chat' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('Workspace — the explorer database.sqlite entry (D-WEB-16)', () => {
  it('window mode: clicking the entry opens AND focuses the db window', () => {
    renderWorkspace('website');
    fireEvent.click(screen.getByRole('button', { name: 'Code Editor' })); // open the editor
    expect(screen.queryByTestId('site-db-pane')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('explorer-database-file'));
    expect(screen.getByTestId('site-db-pane')).toBeInTheDocument();
    const { windows } = usePlaygroundStore.getState();
    expect(windows.db.open).toBe(true);
    // Focused = raised above the editor it was opened from.
    expect(windows.db.zIndex).toBeGreaterThan(windows.code.zIndex);
  });

  it('split mode: clicking the entry switches to the Database tab', () => {
    usePlaygroundStore.getState().setLayoutMode('split');
    renderWorkspace('website');
    fireEvent.click(screen.getByRole('tab', { name: 'Code' }));
    expect(screen.queryByTestId('site-db-pane')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('explorer-database-file'));
    expect(screen.getByRole('tab', { name: 'Database' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('site-db-pane')).toBeInTheDocument();
  });

  it('game: the explorer shows NO database.sqlite entry', () => {
    renderWorkspace('game');
    fireEvent.click(screen.getByRole('button', { name: 'Code Editor' }));
    expect(screen.queryByTestId('explorer-database-file')).not.toBeInTheDocument();
  });
});

describe('playgroundStore — persisted-layout tolerance for the new id', () => {
  it('restoring an OLD snapshot (no db entry) still yields a usable db WinState', () => {
    // An older build's blob — no 'db' key. The restore merge must default it.
    const withoutDb: Record<string, unknown> = { ...defaultWindows() };
    delete withoutDb.db;
    usePlaygroundStore.getState().restore({
      theme: 'light',
      layoutMode: 'window',
      windows: withoutDb as PlaygroundSnapshot['windows'],
      topZ: 9,
    });
    const restored = usePlaygroundStore.getState().windows.db;
    expect(restored).toBeDefined();
    expect(restored.open).toBe(false); // default closed
  });
});
