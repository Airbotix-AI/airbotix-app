// @vitest-environment jsdom
// The Database window becomes EDITABLE (creative-code-studio-website-prd
// D-WEB-16): rowid-keyed inline cell edit (`UPDATE … WHERE rowid = ?`),
// "+ Add row" (`INSERT` omitting an integer id so SQLite assigns it), and the
// two-step row delete — every write a PARAMETERIZED statement through the
// existing querySiteDb seam, followed by a re-introspection. Tables without a
// usable rowid stay read-only with a one-line note; readOnly (teacher/parent)
// viewers get no edit affordances at all.

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import type { VfsFile } from '../../code/codeApi';
import { useSiteDbStore } from '../siteDbStore';
import { DbPane } from './DbPane';

const { listSiteDbTablesMock, listSiteDbRowsMock, querySiteDbMock } = vi.hoisted(() => ({
  listSiteDbTablesMock: vi.fn(),
  listSiteDbRowsMock: vi.fn(),
  querySiteDbMock: vi.fn(),
}));
vi.mock('./playgroundApi', async (orig) => {
  const actual = await orig<typeof import('./playgroundApi')>();
  return {
    ...actual,
    listSiteDbTables: listSiteDbTablesMock,
    listSiteDbRows: listSiteDbRowsMock,
    querySiteDb: querySiteDbMock,
  };
});

const FILES: VfsFile[] = [
  { path: 'index.html', content: '<h1>Hi</h1>', kind: 'text', size: 11 },
];

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
const WRITE_OK = { columns: [], rows: [], row_count: 0, changes: 1, last_insert_rowid: null };

beforeEach(() => {
  vi.clearAllMocks();
  useSiteDbStore.setState({ tables: null, updatedAt: null, error: false });
  listSiteDbTablesMock.mockResolvedValue({ tables: [PETS], size_bytes: 4096 });
  listSiteDbRowsMock.mockResolvedValue({ rows: PETS_ROWS, total: 2, has_rowid: true });
  querySiteDbMock.mockResolvedValue(WRITE_OK);
});

afterEach(cleanup);

/** Click the cell's edit affordance and return its inline input. */
async function openCellEditor(testid: string) {
  const cell = await screen.findByTestId(testid);
  fireEvent.click(within(cell).getByTitle('Click to edit'));
  return within(cell).getByRole('textbox');
}

describe('DbTable — inline cell edit (rowid-keyed)', () => {
  it('Enter saves via a parameterized UPDATE … WHERE rowid = ?, then re-introspects', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    const input = await openCellEditor('db-cell-pets-0-name');
    fireEvent.change(input, { target: { value: 'Rex' } });
    listSiteDbTablesMock.mockClear();

    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(querySiteDbMock).toHaveBeenCalledWith(
        'p1',
        'UPDATE "pets" SET "name" = ? WHERE rowid = ?',
        ['Rex', '1'],
      ),
    );
    // The pane shows SERVER truth: the write triggers a fresh introspection.
    await waitFor(() => expect(listSiteDbTablesMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
  });

  it('quotes identifiers defensively (embedded " doubled)', async () => {
    listSiteDbTablesMock.mockResolvedValue({
      tables: [{ name: 'my "pets"', row_count: 1, columns: [{ name: 'fun "fact"', type: 'TEXT' }] }],
      size_bytes: 1,
    });
    listSiteDbRowsMock.mockResolvedValue({
      rows: [{ __rowid__: '7', 'fun "fact"': 'hi' }],
      total: 1,
      has_rowid: true,
    });
    render(<DbPane projectId="p1" files={FILES} />);
    const input = await openCellEditor('db-cell-my "pets"-0-fun "fact"');

    fireEvent.change(input, { target: { value: 'hi there' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() =>
      expect(querySiteDbMock).toHaveBeenCalledWith(
        'p1',
        'UPDATE "my ""pets""" SET "fun ""fact""" = ? WHERE rowid = ?',
        ['hi there', '7'],
      ),
    );
  });

  it('a long value opens UNCLIPPED (clipping is display-only) and an unchanged Enter writes nothing', async () => {
    const long = 'y'.repeat(200);
    listSiteDbTablesMock.mockResolvedValue({
      tables: [{ name: 'notes', row_count: 1, columns: [{ name: 'body', type: 'TEXT' }] }],
      size_bytes: 1,
    });
    listSiteDbRowsMock.mockResolvedValue({
      rows: [{ __rowid__: '1', body: long }],
      total: 1,
      has_rowid: true,
    });
    render(<DbPane projectId="p1" files={FILES} />);
    const input = await openCellEditor('db-cell-notes-0-body');

    // The draft is the FULL value — never the 120-char clipped render, which
    // would silently truncate the kid's data on save.
    expect((input as HTMLInputElement).value).toBe(long);

    // Nothing typed → Enter is a no-op close, never a write.
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument());
    expect(querySiteDbMock).not.toHaveBeenCalled();

    // A REAL change to a long value saves the full new text.
    const changed = `${long}!`;
    const again = await openCellEditor('db-cell-notes-0-body');
    fireEvent.change(again, { target: { value: changed } });
    fireEvent.keyDown(again, { key: 'Enter' });
    await waitFor(() =>
      expect(querySiteDbMock).toHaveBeenCalledWith(
        'p1',
        'UPDATE "notes" SET "body" = ? WHERE rowid = ?',
        [changed, '1'],
      ),
    );
  });

  it('blur (clicking away) cancels without writing anything', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    const input = await openCellEditor('db-cell-pets-0-name');
    fireEvent.change(input, { target: { value: 'Rex' } });

    fireEvent.blur(input);
    expect(querySiteDbMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('db-cell-pets-0-name')).toHaveTextContent('Biscuit');
  });

  it('Escape cancels without writing anything', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    const input = await openCellEditor('db-cell-pets-0-name');
    fireEvent.change(input, { target: { value: 'Rex' } });

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(querySiteDbMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('db-cell-pets-0-name')).toHaveTextContent('Biscuit');
  });

  it("a failed save surfaces the backend's kid-readable message inline and reverts the value", async () => {
    querySiteDbMock.mockRejectedValue(
      new ApiError(400, 'DB_QUERY_ERROR', "Hmm, that value doesn't fit this column."),
    );
    render(<DbPane projectId="p1" files={FILES} />);
    const input = await openCellEditor('db-cell-pets-0-name');
    fireEvent.change(input, { target: { value: 'Rex' } });

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(
      await within(await screen.findByTestId('db-edit-error-pets')).findByText(
        "Hmm, that value doesn't fit this column.",
      ),
    ).toBeInTheDocument();
    // The editor closed and the display still shows the untouched server value.
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByTestId('db-cell-pets-0-name')).toHaveTextContent('Biscuit');
  });

  it('never renders __rowid__ as a display column', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-collection-pets');
    expect(screen.queryByRole('columnheader', { name: /__rowid__/ })).not.toBeInTheDocument();
    expect(screen.queryByTestId('db-cell-pets-0-__rowid__')).not.toBeInTheDocument();
  });
});

describe('DbTable — Add row', () => {
  it('INSERTs ""/NULL placeholders, omits the integer id, then focuses the new row\'s first cell', async () => {
    querySiteDbMock.mockResolvedValue({ ...WRITE_OK, last_insert_rowid: '3' });
    render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-collection-pets');
    // The refresh AFTER the insert returns the new row.
    listSiteDbRowsMock.mockResolvedValue({
      rows: [...PETS_ROWS, { __rowid__: '3', id: 3, name: '', adopted: null }],
      total: 3,
      has_rowid: true,
    });

    fireEvent.click(screen.getByTestId('db-add-row-pets'));
    await waitFor(() =>
      expect(querySiteDbMock).toHaveBeenCalledWith(
        'p1',
        'INSERT INTO "pets" ("name", "adopted") VALUES (?, ?)',
        ['', null],
      ),
    );
    // Best-effort follow-up: the first fillable cell of the new row opens for editing.
    await waitFor(() =>
      expect(
        within(screen.getByTestId('db-cell-pets-2-name')).getByRole('textbox'),
      ).toBeInTheDocument(),
    );
  });

  it('a table whose only column is the integer id inserts DEFAULT VALUES', async () => {
    listSiteDbTablesMock.mockResolvedValue({
      tables: [{ name: 'clicks', row_count: 1, columns: [{ name: 'id', type: 'INTEGER' }] }],
      size_bytes: 1,
    });
    listSiteDbRowsMock.mockResolvedValue({
      rows: [{ __rowid__: '1', id: 1 }],
      total: 1,
      has_rowid: true,
    });
    render(<DbPane projectId="p1" files={FILES} />);

    fireEvent.click(await screen.findByTestId('db-add-row-clicks'));
    await waitFor(() =>
      expect(querySiteDbMock).toHaveBeenCalledWith('p1', 'INSERT INTO "clicks" DEFAULT VALUES', []),
    );
  });
});

describe('DbTable — two-step row delete', () => {
  it('the first click only ARMS; the second fires a parameterized DELETE by rowid', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-collection-pets');

    const del = screen.getAllByTestId('db-delete-row')[0];
    fireEvent.click(del);
    expect(querySiteDbMock).not.toHaveBeenCalled(); // armed, not fired
    expect(del).toHaveAccessibleName('Really delete row 1?');

    fireEvent.click(del);
    await waitFor(() =>
      expect(querySiteDbMock).toHaveBeenCalledWith('p1', 'DELETE FROM "pets" WHERE rowid = ?', ['1']),
    );
  });

  it('an armed delete disarms by itself when the second click never comes', async () => {
    vi.useFakeTimers();
    try {
      render(<DbPane projectId="p1" files={FILES} />);
      await vi.waitFor(() => {
        expect(screen.getAllByTestId('db-delete-row').length).toBeGreaterThan(0);
      });

      const del = screen.getAllByTestId('db-delete-row')[0];
      fireEvent.click(del);
      expect(del).toHaveAccessibleName('Really delete row 1?');

      await vi.advanceTimersByTimeAsync(6000); // > DELETE_CONFIRM_MS
      expect(del).toHaveAccessibleName('Delete row 1');
      expect(querySiteDbMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('DbTable — the read-only gates', () => {
  it('has_rowid:false renders exactly as before — no edit affordances, one view-only note', async () => {
    listSiteDbRowsMock.mockResolvedValue({ rows: PETS_ROWS, total: 2, has_rowid: false });
    render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-collection-pets');

    expect(screen.queryByTestId('db-add-row-pets')).not.toBeInTheDocument();
    expect(screen.queryByTestId('db-delete-row')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Click to edit')).not.toBeInTheDocument();
    expect(screen.getByText(/View-only: this table has no row ids/)).toBeInTheDocument();
  });

  it('readOnly (teacher/parent viewer) shows NO edit affordances at all — and no note', async () => {
    render(<DbPane projectId="p1" files={FILES} readOnly />);
    await screen.findByTestId('db-collection-pets');

    expect(screen.queryByTestId('db-add-row-pets')).not.toBeInTheDocument();
    expect(screen.queryByTestId('db-delete-row')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Click to edit')).not.toBeInTheDocument();
    expect(screen.queryByText(/View-only/)).not.toBeInTheDocument();
  });
});
