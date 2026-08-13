// @vitest-environment jsdom
// The Database window's "Data sources" discovery surface (creative-code-
// studio-website-prd D-WEB-19): the sidebar gains a second group under the
// tables listing every ENABLED curated external source (`db-source-<name>`,
// absent when the catalog is empty; fetched once on mount + on the manual
// Refresh, never on the 2s poll); selecting a source swaps the right panel to
// its info card (`db-source-detail`: description, params table, copyable
// example line) with a "Try it" (`db-source-try`) that runs the example params
// through the REAL server proxy and pretty-prints the JSON — or surfaces the
// backend's kid-readable error verbatim. Selecting a source deselects the
// table view and vice versa (the D-WEB-18 auto-select-first-table default is
// untouched); readOnly viewers still see sources and may Try them (a read).

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';
import type { VfsFile } from '../../code/codeApi';
import { useSiteDbStore } from '../siteDbStore';
import { DB_POLL_MS, DbPane } from './DbPane';
import type { ProjectSourceInfo } from './playgroundApi';

const {
  listSiteDbTablesMock,
  listSiteDbRowsMock,
  listProjectSourcesMock,
  fetchProjectSourceMock,
} = vi.hoisted(() => ({
  listSiteDbTablesMock: vi.fn(),
  listSiteDbRowsMock: vi.fn(),
  listProjectSourcesMock: vi.fn(),
  fetchProjectSourceMock: vi.fn(),
}));
vi.mock('./playgroundApi', async (orig) => {
  const actual = await orig<typeof import('./playgroundApi')>();
  return {
    ...actual,
    listSiteDbTables: listSiteDbTablesMock,
    listSiteDbRows: listSiteDbRowsMock,
    listProjectSources: listProjectSourcesMock,
    fetchProjectSource: fetchProjectSourceMock,
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
  ],
};

const WEATHER: ProjectSourceInfo = {
  name: 'weather',
  description: 'Real weather for any city — today and the next few days.',
  params: [
    { name: 'city', description: 'Which city to look up', required: true, example: 'Sydney' },
  ],
  example_code: "await sources.get('weather', { city: 'Sydney' })",
};
const JOKES: ProjectSourceInfo = {
  name: 'jokes',
  description: 'A random kid-friendly joke.',
  params: [],
  example_code: "await sources.get('jokes')",
};

beforeEach(() => {
  vi.clearAllMocks();
  useSiteDbStore.setState({ tables: null, sizeBytes: null, updatedAt: null, error: false });
  listSiteDbTablesMock.mockResolvedValue({ tables: [PETS], size_bytes: 4096 });
  listSiteDbRowsMock.mockResolvedValue({ rows: [], total: 2, has_rowid: true });
  listProjectSourcesMock.mockResolvedValue([WEATHER, JOKES]);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('DbPane — the "Data sources" sidebar group (D-WEB-19)', () => {
  it('lists every enabled source under the tables; the table stays the default selection', async () => {
    render(<DbPane projectId="p1" files={FILES} />);

    expect(await screen.findByText('Data sources')).toBeInTheDocument();
    expect(screen.getByTestId('db-source-weather')).toHaveTextContent('weather');
    expect(screen.getByTestId('db-source-jokes')).toHaveTextContent('jokes');

    // D-WEB-18 untouched: the first TABLE is auto-selected, no source is.
    expect(screen.getByTestId('db-table-pets')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('db-source-weather')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('db-collection-pets')).toBeInTheDocument();
    expect(screen.queryByTestId('db-source-detail')).not.toBeInTheDocument();
  });

  it('an EMPTY catalog renders no group at all (no noise)', async () => {
    listProjectSourcesMock.mockResolvedValue([]);
    render(<DbPane projectId="p1" files={FILES} />);

    await screen.findByTestId('db-collection-pets');
    expect(screen.queryByText('Data sources')).not.toBeInTheDocument();
    expect(screen.queryByTestId('db-source-weather')).not.toBeInTheDocument();
  });

  it('a failed catalog fetch is silent — the pane still renders the tables', async () => {
    listProjectSourcesMock.mockRejectedValue(new Error('offline'));
    render(<DbPane projectId="p1" files={FILES} />);

    expect(await screen.findByTestId('db-collection-pets')).toBeInTheDocument();
    expect(screen.queryByText('Data sources')).not.toBeInTheDocument();
  });

  it('fetches the catalog ONCE on mount — the 2s poll never refetches; manual Refresh does', async () => {
    vi.useFakeTimers();
    render(<DbPane projectId="p1" files={FILES} />);
    expect(listProjectSourcesMock).toHaveBeenCalledTimes(1); // mount

    await act(async () => {
      await vi.advanceTimersByTimeAsync(DB_POLL_MS * 3);
    });
    expect(listSiteDbTablesMock.mock.calls.length).toBeGreaterThan(1); // polls ran…
    expect(listProjectSourcesMock).toHaveBeenCalledTimes(1); // …the catalog didn't

    fireEvent.click(screen.getByRole('button', { name: 'Refresh database' }));
    expect(listProjectSourcesMock).toHaveBeenCalledTimes(2);
  });

  it('a Refresh answer for a PREVIOUS project never lands after a project switch (stale-guarded)', async () => {
    const { rerender } = render(<DbPane projectId="p1" files={FILES} />);
    await screen.findByTestId('db-source-weather');

    // Arm a Refresh whose catalog answer we control, then switch projects
    // while it is still in flight.
    let answerOldRefresh!: (catalog: ProjectSourceInfo[]) => void;
    listProjectSourcesMock.mockImplementationOnce(
      () => new Promise<ProjectSourceInfo[]>((resolve) => { answerOldRefresh = resolve; }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Refresh database' }));

    listProjectSourcesMock.mockResolvedValue([]); // p2 has no sources
    rerender(<DbPane projectId="p2" files={FILES} />);
    await waitFor(() =>
      expect(screen.queryByTestId('db-source-weather')).not.toBeInTheDocument(),
    );

    // The OLD project's late answer must not flash its catalog as p2's truth.
    await act(async () => {
      answerOldRefresh([WEATHER, JOKES]);
    });
    expect(screen.queryByTestId('db-source-weather')).not.toBeInTheDocument();
    expect(screen.queryByText('Data sources')).not.toBeInTheDocument();
  });
});

describe('DbPane — the source detail card + Try it (D-WEB-19)', () => {
  it('selecting a source swaps the right panel to its info card; the table view comes back on a table click', async () => {
    render(<DbPane projectId="p1" files={FILES} />);
    fireEvent.click(await screen.findByTestId('db-source-weather'));

    // The info card replaces the grid; sidebar selection follows.
    const detail = screen.getByTestId('db-source-detail');
    expect(detail).toHaveTextContent('weather');
    expect(detail).toHaveTextContent('Real weather for any city');
    expect(screen.queryByTestId('db-collection-pets')).not.toBeInTheDocument();
    expect(screen.getByTestId('db-source-weather')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('db-table-pets')).toHaveAttribute('aria-pressed', 'false');

    // Params table: name / description / required / example.
    expect(detail).toHaveTextContent('city');
    expect(detail).toHaveTextContent('Which city to look up');
    expect(detail).toHaveTextContent('yes');
    expect(detail).toHaveTextContent('Sydney');
    // The copyable example line.
    expect(screen.getByTestId('db-source-example')).toHaveTextContent(
      "await sources.get('weather', { city: 'Sydney' })",
    );

    // Back to the table: the grid returns, the source deselects.
    fireEvent.click(screen.getByTestId('db-table-pets'));
    expect(screen.getByTestId('db-collection-pets')).toBeInTheDocument();
    expect(screen.queryByTestId('db-source-detail')).not.toBeInTheDocument();
    expect(screen.getByTestId('db-source-weather')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('db-table-pets')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Try it runs the example params through the server proxy and pretty-prints the JSON', async () => {
    fetchProjectSourceMock.mockResolvedValue({
      data: { city: 'Sydney', temperature_c: 21 },
      cached: false,
    });
    render(<DbPane projectId="p1" files={FILES} />);
    fireEvent.click(await screen.findByTestId('db-source-weather'));

    fireEvent.click(screen.getByTestId('db-source-try'));

    expect(fetchProjectSourceMock).toHaveBeenCalledWith('p1', 'weather', { city: 'Sydney' });
    const result = await screen.findByTestId('db-source-result');
    expect(result).toHaveTextContent('"city": "Sydney"');
    expect(result).toHaveTextContent('"temperature_c": 21');
  });

  it('a Try-it failure surfaces the backend kid-readable message VERBATIM (calm fallback otherwise)', async () => {
    const backendMessage = 'The weather service is having a nap — try again in a moment.';
    fetchProjectSourceMock.mockRejectedValue(new ApiError(400, 'SOURCE_UPSTREAM', backendMessage));
    render(<DbPane projectId="p1" files={FILES} />);
    fireEvent.click(await screen.findByTestId('db-source-weather'));

    fireEvent.click(screen.getByTestId('db-source-try'));
    expect(await screen.findByTestId('db-source-error')).toHaveTextContent(backendMessage);

    // A retry after a fix clears the error and shows the data.
    fetchProjectSourceMock.mockResolvedValue({ data: { ok: true }, cached: true });
    fireEvent.click(screen.getByTestId('db-source-try'));
    await screen.findByTestId('db-source-result');
    expect(screen.queryByTestId('db-source-error')).not.toBeInTheDocument();
  });

  it('switching sources resets the Try-it state (no stale result bleeds across)', async () => {
    fetchProjectSourceMock.mockResolvedValue({ data: { temperature_c: 21 }, cached: false });
    render(<DbPane projectId="p1" files={FILES} />);
    fireEvent.click(await screen.findByTestId('db-source-weather'));
    fireEvent.click(screen.getByTestId('db-source-try'));
    await screen.findByTestId('db-source-result');

    fireEvent.click(screen.getByTestId('db-source-jokes'));
    expect(screen.getByTestId('db-source-detail')).toHaveTextContent('jokes');
    expect(screen.queryByTestId('db-source-result')).not.toBeInTheDocument();
  });

  it('readOnly (teacher/parent viewer) still sees sources and may Try them — it is a read', async () => {
    fetchProjectSourceMock.mockResolvedValue({ data: { setup: 'Knock knock' }, cached: true });
    render(<DbPane projectId="p1" files={FILES} readOnly />);

    fireEvent.click(await screen.findByTestId('db-source-jokes'));
    expect(screen.getByTestId('db-source-detail')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('db-source-try'));
    expect(fetchProjectSourceMock).toHaveBeenCalledWith('p1', 'jokes', {});
    await waitFor(() =>
      expect(screen.getByTestId('db-source-result')).toHaveTextContent('Knock knock'),
    );
    // …while the write affordances stay hidden, as everywhere readOnly.
    expect(screen.queryByTestId('db-reset')).not.toBeInTheDocument();
  });

  it('copies the example line to the clipboard from the code chip', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<DbPane projectId="p1" files={FILES} />);
    fireEvent.click(await screen.findByTestId('db-source-weather'));

    fireEvent.click(screen.getByRole('button', { name: 'Copy example code' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("await sources.get('weather', { city: 'Sydney' })"),
    );
  });

  it('teaches the OPEN sources.fetch door with its own copyable chip (D-WEB-23)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<DbPane projectId="p1" files={FILES} />);
    fireEvent.click(await screen.findByTestId('db-source-weather'));

    // The teaching line: the catalog is only the convenience shelf.
    expect(screen.getByTestId('db-source-fetch-hint')).toHaveTextContent(
      /fetch any public API, not just these sources/,
    );
    expect(screen.getByTestId('db-source-fetch-example')).toHaveTextContent(
      "await sources.fetch('https://api.example.com/data')",
    );

    fireEvent.click(screen.getByRole('button', { name: 'Copy sources.fetch example' }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("await sources.fetch('https://api.example.com/data')"),
    );
  });
});
