// The Database window's store seam (creative-code-studio-website-prd D-WEB-15):
// REST introspection of the project's server-side db — `refresh(projectId)`
// fetches the schema + first rows per table, failed polls keep the last
// snapshot, and a superseded fetch (reset raced an in-flight poll) never
// overwrites fresher truth.
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSiteDbStore, DB_ROWS_DISPLAY_LIMIT } from './siteDbStore';

const { listSiteDbTablesMock, listSiteDbRowsMock } = vi.hoisted(() => ({
  listSiteDbTablesMock: vi.fn(),
  listSiteDbRowsMock: vi.fn(),
}));
vi.mock('./panes/playgroundApi', async (orig) => {
  const actual = await orig<typeof import('./panes/playgroundApi')>();
  return {
    ...actual,
    listSiteDbTables: listSiteDbTablesMock,
    listSiteDbRows: listSiteDbRowsMock,
  };
});

const PETS_TABLE = {
  name: 'pets',
  row_count: 2,
  columns: [
    { name: 'id', type: 'INTEGER' },
    { name: 'name', type: 'TEXT' },
  ],
};
const PETS_ROWS = [
  { id: 1, name: 'Biscuit' },
  { id: 2, name: 'Mochi' },
];

beforeEach(() => {
  vi.clearAllMocks();
  useSiteDbStore.setState({ tables: null, updatedAt: null });
  listSiteDbTablesMock.mockResolvedValue({ tables: [PETS_TABLE], size_bytes: 4096 });
  listSiteDbRowsMock.mockResolvedValue({ rows: PETS_ROWS, total: 2 });
});

describe('siteDbStore — refresh (REST introspection)', () => {
  it('fetches the schema + the first rows per table and stamps updatedAt', async () => {
    await useSiteDbStore.getState().refresh('p1');

    expect(listSiteDbTablesMock).toHaveBeenCalledWith('p1');
    expect(listSiteDbRowsMock).toHaveBeenCalledWith('p1', 'pets', {
      limit: DB_ROWS_DISPLAY_LIMIT,
    });
    expect(useSiteDbStore.getState().tables).toEqual([{ ...PETS_TABLE, rows: PETS_ROWS }]);
    expect(useSiteDbStore.getState().updatedAt).not.toBeNull();
  });

  it('a failed poll KEEPS the last snapshot and its updatedAt (freshness ages honestly)', async () => {
    await useSiteDbStore.getState().refresh('p1');
    const before = useSiteDbStore.getState();

    listSiteDbTablesMock.mockRejectedValue(new Error('offline'));
    await useSiteDbStore.getState().refresh('p1');

    expect(useSiteDbStore.getState().tables).toEqual(before.tables);
    expect(useSiteDbStore.getState().updatedAt).toBe(before.updatedAt);
  });

  it('reset drops the snapshot AND invalidates an in-flight poll (post-Reset truth wins)', async () => {
    // A slow poll is in flight when the kid hits Reset database…
    let resolveTables!: (v: { tables: typeof PETS_TABLE[]; size_bytes: number }) => void;
    listSiteDbTablesMock.mockReturnValue(
      new Promise((r) => {
        resolveTables = r;
      }),
    );
    const inFlight = useSiteDbStore.getState().refresh('p1');

    useSiteDbStore.getState().reset();
    expect(useSiteDbStore.getState().tables).toBeNull();
    expect(useSiteDbStore.getState().updatedAt).toBeNull();

    // …the stale poll lands AFTER the reset — it must not resurrect old rows.
    resolveTables({ tables: [PETS_TABLE], size_bytes: 4096 });
    await inFlight;
    expect(useSiteDbStore.getState().tables).toBeNull();
  });

  it('a newer refresh supersedes an older in-flight one (last write is the freshest fetch)', async () => {
    const STALE = { tables: [{ ...PETS_TABLE, row_count: 1 }], size_bytes: 1 };
    let resolveStale!: (v: typeof STALE) => void;
    listSiteDbTablesMock.mockReturnValueOnce(
      new Promise((r) => {
        resolveStale = r;
      }),
    );
    const stale = useSiteDbStore.getState().refresh('p1');

    // The newer poll resolves first…
    await useSiteDbStore.getState().refresh('p1');
    expect(useSiteDbStore.getState().tables?.[0].row_count).toBe(2);

    // …and the older one, resolving late, is discarded.
    resolveStale(STALE);
    await stale;
    expect(useSiteDbStore.getState().tables?.[0].row_count).toBe(2);
  });
});
