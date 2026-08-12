// @vitest-environment jsdom
// The Database window (Website Studio, creative-code-studio-website-prd): the
// live in-frame db rendered kid-friendly — collections by shape (table / list /
// fields / value), the `db-collection-<name>` heading with a row count (harness
// journey contract, with `site-db-pane` + `db-refresh`), live polling while
// mounted, the manual refresh, the data/*.json edit jump, and the empty state.

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../../code/codeApi';
import { usePlaygroundStore } from '../playgroundStore';
import { useSiteDbStore } from '../siteDbStore';
import { DB_POLL_MS, DbPane } from './DbPane';

const text = (path: string, content: string): VfsFile => ({
  path,
  content,
  kind: 'text',
  size: content.length,
});

const FILES: VfsFile[] = [text('index.html', '<h1>Hi</h1>'), text('data/pets.json', '[]')];

beforeEach(() => {
  useSiteDbStore.setState({ db: null, updatedAt: null, refreshTrigger: null });
  usePlaygroundStore.getState().setLayoutMode('split'); // ensureGameRunnerVisible no-ops
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

const setDb = (db: Record<string, unknown>) => act(() => useSiteDbStore.getState().setDb(db));

describe('DbPane — rendering by shape', () => {
  it('renders an array of objects as a table under a `name · N rows` heading', () => {
    render(<DbPane files={FILES} />);
    setDb({
      pets: [
        { id: 1, name: 'Biscuit', adopted: false },
        { id: 2, name: 'Mochi' }, // missing key → union column, empty cell
      ],
    });

    expect(screen.getByTestId('site-db-pane')).toBeInTheDocument();
    expect(screen.getByTestId('db-collection-pets')).toHaveTextContent('pets · 2 rows');
    // Union columns + values.
    expect(screen.getByRole('columnheader', { name: 'adopted' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Biscuit' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'false' })).toBeInTheDocument();
  });

  it('renders primitives as a list, plain objects as fields, and clips long values', () => {
    render(<DbPane files={FILES} />);
    setDb({
      colors: ['red', 'blue'],
      settings: { title: 'Pet Shop', open: true },
      motto: 'x'.repeat(300),
    });

    expect(screen.getByTestId('db-collection-colors')).toHaveTextContent('colors · 2 rows');
    expect(screen.getByText('red')).toBeInTheDocument();
    expect(screen.getByTestId('db-collection-settings')).toHaveTextContent('settings · 2 fields');
    expect(screen.getByText('Pet Shop')).toBeInTheDocument();
    // A single primitive collection has no count suffix; its value is clipped.
    expect(screen.getByTestId('db-collection-motto')).toHaveTextContent(/^motto$/);
    expect(screen.getByText(`${'x'.repeat(120)}…`)).toBeInTheDocument();
  });

  it('an EMPTY db shows the friendly empty state; no snapshot yet shows the waiting state', () => {
    render(<DbPane files={FILES} />);
    // db === null (no snapshot yet this run).
    expect(screen.getByText(/Peeking into your site's memory/)).toBeInTheDocument();

    setDb({});
    expect(screen.getByText(/isn't remembering anything yet/)).toBeInTheDocument();
  });
});

describe('DbPane — refresh (manual + live polling while mounted)', () => {
  it('the Refresh button (aria "Refresh database") triggers the store refresh', () => {
    const trigger = vi.fn();
    useSiteDbStore.getState().registerRefresh(trigger);
    render(<DbPane files={FILES} />);
    trigger.mockClear(); // the mount request is asserted separately below

    fireEvent.click(screen.getByRole('button', { name: 'Refresh database' }));
    expect(screen.getByTestId('db-refresh')).toBeInTheDocument();
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it('requests on mount and every ~2s while mounted; unmount stops the polling', () => {
    vi.useFakeTimers();
    const trigger = vi.fn();
    useSiteDbStore.getState().registerRefresh(trigger);
    const { unmount } = render(<DbPane files={FILES} />);
    expect(trigger).toHaveBeenCalledTimes(1); // mount request

    act(() => vi.advanceTimersByTime(DB_POLL_MS * 2));
    expect(trigger).toHaveBeenCalledTimes(3);

    // Closed window = unmounted pane = no polling (the "never poll while
    // closed" guarantee lives in mount, not in open-state plumbing).
    unmount();
    act(() => vi.advanceTimersByTime(DB_POLL_MS * 5));
    expect(trigger).toHaveBeenCalledTimes(3);
  });

  it('shows "live" for a fresh snapshot and "updated Ns ago" for a stale one', () => {
    render(<DbPane files={FILES} />);
    setDb({ pets: [] });
    expect(screen.getByTestId('db-freshness')).toHaveTextContent('live');

    act(() => useSiteDbStore.getState().setDb({ pets: [] }, Date.now() - 30_000));
    expect(screen.getByTestId('db-freshness')).toHaveTextContent(/updated \d+s ago/);
  });
});

describe('DbPane — "Edit starting data" (the data/*.json jump)', () => {
  it('opens data/<name>.json through the open-file seam — only for collections with a seed', () => {
    const onOpenDataFile = vi.fn();
    render(<DbPane files={FILES} onOpenDataFile={onOpenDataFile} />);
    setDb({ pets: [], visits: 3 }); // visits is runtime-only (no seed file)

    fireEvent.click(screen.getByTestId('db-edit-pets'));
    expect(onOpenDataFile).toHaveBeenCalledWith('data/pets.json');
    expect(screen.queryByTestId('db-edit-visits')).not.toBeInTheDocument();
    // The teaching line: runtime memory resets, permanent data lives in files.
    expect(screen.getByText(/reload starts fresh/i)).toBeInTheDocument();
  });

  it('read-only (teacher viewer) hides the edit affordance', () => {
    render(<DbPane files={FILES} onOpenDataFile={vi.fn()} readOnly />);
    setDb({ pets: [] });
    expect(screen.queryByTestId('db-edit-pets')).not.toBeInTheDocument();
  });
});
