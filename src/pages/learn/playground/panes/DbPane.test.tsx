// @vitest-environment jsdom
// The Database window (Website Studio, creative-code-studio-website-prd
// D-WEB-15/18): the project's server-side db as a master–detail db tool — a
// `db-table-<name>` sidebar (live row counts, first table auto-selected,
// selection kept by name across polls, fallback when the selected table
// vanishes) and the SELECTED table's grid wrapped in `db-collection-<name>`
// with the REAL row count (harness journey contract, with `site-db-pane` +
// `db-refresh` + `db-reset`), REST polling while mounted, the manual refresh,
// the toolbar's two-step Reset database and data/*.json edit jump, and the
// empty/waiting states.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import type { VfsFile } from '../../code/codeApi';
import { useSiteDbStore } from '../siteDbStore';
import { DB_POLL_MS, DbPane } from './DbPane';

const { listSiteDbTablesMock, listSiteDbRowsMock, resetSiteDbMock } = vi.hoisted(() => ({
  listSiteDbTablesMock: vi.fn(),
  listSiteDbRowsMock: vi.fn(),
  resetSiteDbMock: vi.fn(),
}));
vi.mock('./playgroundApi', async (orig) => {
  const actual = await orig<typeof import('./playgroundApi')>();
  return {
    ...actual,
    listSiteDbTables: listSiteDbTablesMock,
    listSiteDbRows: listSiteDbRowsMock,
    resetSiteDb: resetSiteDbMock,
  };
});

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const FILES: VfsFile[] = [text('index.html', '<h1>Hi</h1>'), text('data/pets.json', '[]')];

const PETS = {
  name: 'pets',
  row_count: 2,
  columns: [
    { name: 'id', type: 'INTEGER' },
    { name: 'name', type: 'TEXT' },
    { name: 'adopted', type: 'INTEGER' },
  ],
};
const PETS_ROWS = [
  { __rowid__: '1', id: 1, name: 'Biscuit', adopted: 0 },
  { __rowid__: '2', id: 2, name: 'Mochi', adopted: 1 },
];
// A second table — made by CREATE TABLE, so it has NO data/visits.json seed.
const VISITS = {
  name: 'visits',
  row_count: 5,
  columns: [{ name: 'id', type: 'INTEGER' }],
};

beforeEach(() => {
  vi.clearAllMocks();
  useSiteDbStore.setState({ tables: null, sizeBytes: null, updatedAt: null, error: false });
  listSiteDbTablesMock.mockResolvedValue({ tables: [PETS], size_bytes: 4096 });
  listSiteDbRowsMock.mockResolvedValue({ rows: PETS_ROWS, total: 2, has_rowid: true });
  resetSiteDbMock.mockResolvedValue({ tables: [PETS], size_bytes: 4096 });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('DbPane — rendering the server-side tables', () => {
  it('renders the SELECTED table: `name · N rows` heading, columns with types, cells', async () => {
    render(<DbPane projectId="p1" files={FILES} />);

    expect(await screen.findByTestId('db-collection-pets')).toHaveTextContent('pets · 2 rows');
    expect(screen.getByTestId('site-db-pane')).toBeInTheDocument();
    // Contract columns (with the SQLite type shown subtly) + row values.
    expect(screen.getByRole('columnheader', { name: /name\s*text/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /adopted\s*integer/i })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Biscuit' })).toBeInTheDocument();
  });

  it('clips long cell values and hints when more rows exist server-side', async () => {
    listSiteDbTablesMock.mockResolvedValue({
      tables: [{ name: 'notes', row_count: 80, columns: [{ name: 'body', type: 'TEXT' }] }],
      size_bytes: 1,
    });
    listSiteDbRowsMock.mockResolvedValue({
      rows: [{ body: 'x'.repeat(300) }],
      total: 80,
    });
    render(<DbPane projectId="p1" files={FILES} />);

    expect(await screen.findByTestId('db-collection-notes')).toHaveTextContent('notes · 80 rows');
    expect(screen.getByText(`${'x'.repeat(120)}…`)).toBeInTheDocument();
    expect(screen.getByText(/Showing the first 1 of 80 rows/)).toBeInTheDocument();
  });

  it('shows the waiting state before the first snapshot and the empty state with no tables', async () => {
    listSiteDbTablesMock.mockReturnValue(new Promise(() => undefined)); // never answers
    const { unmount } = render(<DbPane projectId="p1" files={FILES} />);
    expect(screen.getByText(/Peeking into your database/)).toBeInTheDocument();
    unmount();

    listSiteDbTablesMock.mockResolvedValue({ tables: [], size_bytes: 0 });
    render(<DbPane projectId="p1" files={FILES} />);
    expect(await screen.findByText(/No tables yet/)).toBeInTheDocument();
    // The empty state teaches BOTH creation paths: a seed file or CREATE TABLE.
    expect(screen.getByText(/starting file, or CREATE TABLE/)).toBeInTheDocument();
  });

  it('teaches the persistent-db story: server-side, keeps data, seeds are the starting data', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    expect(
      await screen.findByText(/lives on Airbotix servers and KEEPS its data/),
    ).toBeInTheDocument();
    expect(screen.getByText(/rebuilds every table from them and wipes your changes/)).toBeInTheDocument();
  });
});

describe('DbPane — refresh (manual + REST polling while mounted)', () => {
  it('the Refresh button (aria "Refresh database") re-introspects now', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-collection-pets');
    listSiteDbTablesMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh database' }));
    expect(screen.getByTestId('db-refresh')).toBeInTheDocument();
    await waitFor(() => expect(listSiteDbTablesMock).toHaveBeenCalledTimes(1));
    expect(listSiteDbTablesMock).toHaveBeenCalledWith('p1');
  });

  it('polls on mount and every ~2s while mounted; unmount stops the polling', async () => {
    vi.useFakeTimers();
    const { unmount } = render(<DbPane projectId="p1" files={FILES} />);
    expect(listSiteDbTablesMock).toHaveBeenCalledTimes(1); // mount request

    await act(async () => {
      vi.advanceTimersByTime(DB_POLL_MS * 2);
    });
    expect(listSiteDbTablesMock).toHaveBeenCalledTimes(3);

    // Closed window = unmounted pane = no polling (the "never poll while
    // closed" guarantee lives in mount, not in open-state plumbing).
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(DB_POLL_MS * 5);
    });
    expect(listSiteDbTablesMock).toHaveBeenCalledTimes(3);
  });

  it('a persistently failing FIRST load shows the unreachable state with a working Retry', async () => {
    listSiteDbTablesMock.mockRejectedValue(new Error('offline'));
    render(<DbPane projectId="p1" files={FILES} />);

    // Honest dead-end, not an infinite "Peeking…" spinner.
    expect(await screen.findByText(/Your database didn't answer/)).toBeInTheDocument();
    expect(screen.queryByText(/Peeking into your database/)).not.toBeInTheDocument();

    // Retry drives the SAME refresh — once the backend answers, tables render.
    listSiteDbTablesMock.mockResolvedValue({ tables: [PETS], size_bytes: 4096 });
    fireEvent.click(screen.getByTestId('db-retry'));
    expect(await screen.findByTestId('db-collection-pets')).toBeInTheDocument();
  });

  it('pauses the poll while the TAB is hidden and refreshes on return', async () => {
    vi.useFakeTimers();
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    try {
      render(<DbPane projectId="p1" files={FILES} />);
      expect(listSiteDbTablesMock).toHaveBeenCalledTimes(1); // mount request

      await act(async () => {
        vi.advanceTimersByTime(DB_POLL_MS * 3);
      });
      expect(listSiteDbTablesMock).toHaveBeenCalledTimes(1); // hidden: no polls

      hidden.mockReturnValue(false);
      await act(async () => {
        fireEvent(document, new Event('visibilitychange'));
      });
      expect(listSiteDbTablesMock).toHaveBeenCalledTimes(2); // visible again: refresh now
    } finally {
      hidden.mockRestore();
    }
  });

  it('never polls without a projectId (project-less session)', () => {
    vi.useFakeTimers();
    render(<DbPane files={FILES} />);
    act(() => vi.advanceTimersByTime(DB_POLL_MS * 3));
    expect(listSiteDbTablesMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Peeking into your database/)).toBeInTheDocument();
  });

  it('shows "live" for a fresh snapshot and "updated Ns ago" for a stale one', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-collection-pets');
    expect(screen.getByTestId('db-freshness')).toHaveTextContent('live');

    act(() => useSiteDbStore.setState({ updatedAt: Date.now() - 30_000 }));
    await waitFor(() =>
      expect(screen.getByTestId('db-freshness')).toHaveTextContent(/updated \d+s ago/),
    );
  });
});

describe('DbPane — "Edit starting data" (the data/*.json jump, toolbar-scoped)', () => {
  it('opens data/<name>.json through the open-file seam — only when the SELECTED table has a seed', async () => {
    listSiteDbTablesMock.mockResolvedValue({ tables: [PETS, VISITS], size_bytes: 1 });
    const onOpenDataFile = vi.fn();
    render(<DbPane projectId="p1" files={FILES} onOpenDataFile={onOpenDataFile} />);

    fireEvent.click(await screen.findByTestId('db-edit-pets'));
    expect(onOpenDataFile).toHaveBeenCalledWith('data/pets.json');

    // visits was made by CREATE TABLE — no seed file, no edit affordance once
    // it becomes the selection (the toolbar button follows the selected table).
    fireEvent.click(screen.getByTestId('db-table-visits'));
    expect(screen.queryByTestId('db-edit-visits')).not.toBeInTheDocument();
    expect(screen.queryByTestId('db-edit-pets')).not.toBeInTheDocument();
  });

  it('read-only (teacher viewer) hides the edit affordance', async () => {
    render(<DbPane projectId="p1" files={FILES} onOpenDataFile={vi.fn()} readOnly />);
    await screen.findByTestId('db-collection-pets');
    expect(screen.queryByTestId('db-edit-pets')).not.toBeInTheDocument();
  });
});

describe('DbPane — master–detail layout (D-WEB-18)', () => {
  it('the sidebar lists EVERY table with its live row count; the FIRST table auto-selects', async () => {
    listSiteDbTablesMock.mockResolvedValue({ tables: [PETS, VISITS], size_bytes: 4096 });
    render(<DbPane projectId="p1" files={FILES} />);

    // Every table is a selectable sidebar row: name + live row count.
    expect(await screen.findByTestId('db-table-pets')).toHaveTextContent('pets');
    expect(screen.getByTestId('db-table-pets')).toHaveTextContent('2');
    expect(screen.getByTestId('db-table-visits')).toHaveTextContent('visits');
    expect(screen.getByTestId('db-table-visits')).toHaveTextContent('5');

    // First table auto-selected; the right panel shows ONLY its grid.
    expect(screen.getByTestId('db-table-pets')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('db-table-visits')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('db-collection-pets')).toBeInTheDocument();
    expect(screen.queryByTestId('db-collection-visits')).not.toBeInTheDocument();
  });

  it('clicking a sidebar table switches the right panel (db-collection-<name> follows)', async () => {
    listSiteDbTablesMock.mockResolvedValue({ tables: [PETS, VISITS], size_bytes: 4096 });
    render(<DbPane projectId="p1" files={FILES} />);

    fireEvent.click(await screen.findByTestId('db-table-visits'));
    expect(screen.getByTestId('db-table-visits')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('db-table-pets')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('db-collection-visits')).toBeInTheDocument();
    expect(screen.queryByTestId('db-collection-pets')).not.toBeInTheDocument();
  });

  it('the selection survives a poll (kept by NAME, never by snapshot identity)', async () => {
    vi.useFakeTimers();
    listSiteDbTablesMock.mockResolvedValue({ tables: [PETS, VISITS], size_bytes: 4096 });
    render(<DbPane projectId="p1" files={FILES} />);
    await vi.waitFor(() => {
      expect(screen.getByTestId('db-table-visits')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('db-table-visits'));
    expect(screen.getByTestId('db-collection-visits')).toBeInTheDocument();

    // A full poll cycle replaces the snapshot — the pick must hold.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DB_POLL_MS);
    });
    expect(screen.getByTestId('db-table-visits')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('db-collection-visits')).toBeInTheDocument();
  });

  it('a selected table that VANISHED (e.g. Reset removed it) falls back to the first table', async () => {
    listSiteDbTablesMock.mockResolvedValue({ tables: [PETS, VISITS], size_bytes: 4096 });
    render(<DbPane projectId="p1" files={FILES} />);
    fireEvent.click(await screen.findByTestId('db-table-visits'));
    expect(screen.getByTestId('db-collection-visits')).toBeInTheDocument();

    // The next introspection no longer has `visits` — same store path a poll takes.
    listSiteDbTablesMock.mockResolvedValue({ tables: [PETS], size_bytes: 4096 });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh database' }));

    await waitFor(() =>
      expect(screen.queryByTestId('db-table-visits')).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId('db-table-pets')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('db-collection-pets')).toBeInTheDocument();
  });

  it("the sidebar's identity line names database.sqlite with the introspected size", async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    expect(await screen.findByTestId('db-file-identity')).toHaveTextContent(
      'database.sqlite · 4 KB',
    );
  });

  it('readOnly (teacher/parent viewer) still NAVIGATES the sidebar — viewing is allowed', async () => {
    listSiteDbTablesMock.mockResolvedValue({ tables: [PETS, VISITS], size_bytes: 4096 });
    render(<DbPane projectId="p1" files={FILES} readOnly />);

    fireEvent.click(await screen.findByTestId('db-table-visits'));
    expect(screen.getByTestId('db-collection-visits')).toBeInTheDocument();
    // …but no editing affordances anywhere.
    expect(screen.queryByTestId('db-reset')).not.toBeInTheDocument();
    expect(screen.queryByTestId('db-edit-visits')).not.toBeInTheDocument();
  });
});

describe('DbPane — Reset database (two-step inline confirmation)', () => {
  it('the first click only ARMS the button; the second fires the reset and refreshes', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-collection-pets');
    listSiteDbTablesMock.mockClear();

    const reset = screen.getByTestId('db-reset');
    expect(reset).toHaveAccessibleName('Reset database');
    fireEvent.click(reset);
    expect(resetSiteDbMock).not.toHaveBeenCalled(); // armed, not fired
    expect(reset).toHaveTextContent(/Really reset\?/);

    fireEvent.click(reset);
    await waitFor(() => expect(resetSiteDbMock).toHaveBeenCalledWith('p1'));
    // After the reset the pane re-introspects (fresh post-reset truth).
    await waitFor(() => expect(listSiteDbTablesMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByTestId('db-reset')).toHaveTextContent('Reset database'));
  });

  it('an armed Reset disarms by itself when the second click never comes', async () => {
    vi.useFakeTimers();
    render(<DbPane projectId="p1" files={FILES} />);

    fireEvent.click(screen.getByTestId('db-reset'));
    expect(screen.getByTestId('db-reset')).toHaveTextContent(/Really reset\?/);

    await act(async () => {
      vi.advanceTimersByTime(6000); // > RESET_CONFIRM_MS
    });
    expect(screen.getByTestId('db-reset')).toHaveTextContent('Reset database');
    expect(resetSiteDbMock).not.toHaveBeenCalled();
  });

  it('a failed reset shows the kid-readable error and returns to idle', async () => {
    resetSiteDbMock.mockRejectedValue(new ApiError(500, 'HTTP_500', 'The database is busy right now.'));
    render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-collection-pets');

    fireEvent.click(screen.getByTestId('db-reset'));
    fireEvent.click(screen.getByTestId('db-reset'));

    expect(await screen.findByText('The database is busy right now.')).toBeInTheDocument();
    expect(screen.getByTestId('db-reset')).toHaveTextContent('Reset database');
  });

  it('read-only (teacher viewer) hides Reset database entirely', async () => {
    render(<DbPane projectId="p1" files={FILES} readOnly />);
    await screen.findByTestId('db-collection-pets');
    expect(screen.queryByTestId('db-reset')).not.toBeInTheDocument();
  });
});
