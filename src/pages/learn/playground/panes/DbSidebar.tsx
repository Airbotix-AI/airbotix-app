// The Database window's LEFT panel (creative-code-studio-website-prd
// D-WEB-18/19): a real db-tool table list — every server-side table as a
// selectable row (icon · name · live row count), the selected one clearly
// marked — plus, when the project has any, a "Data sources" group listing the
// curated external sources (`db-source-<name>`; an empty catalog renders no
// group at all), and the `database.sqlite` identity line (file name + size
// from the same introspection response) pinned to the bottom. Pure
// presentation: selection state lives in DbPane (by NAME, so it survives the
// ~2s re-introspection polls; picking a source deselects the table view and
// vice versa).

import { Globe, Table2 } from 'lucide-react';

import type { SiteDbTableSnapshot } from '../siteDbStore';
import type { ProjectSourceInfo } from './playgroundApi';

/** Kid-readable db file size — whole units, no false precision. */
function formatDbSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DbSidebarProps {
  tables: SiteDbTableSnapshot[];
  /** The EFFECTIVELY selected table's name (DbPane falls back to the first
   *  table when the chosen one vanished — this is the post-fallback truth).
   *  null while a DATA SOURCE is selected instead (no table highlighted). */
  selectedName: string | null;
  onSelect: (name: string) => void;
  /** The db file's size in bytes when the store has it; null hides the size. */
  sizeBytes: number | null;
  /** The enabled external data-source catalog (D-WEB-19) — an empty catalog
   *  renders no "Data sources" group at all. */
  sources: ProjectSourceInfo[];
  /** The selected source's name, or null while a table is selected. */
  selectedSourceName: string | null;
  onSelectSource: (name: string) => void;
}

/**
 * The master list of the master–detail Database window: tables (and the data
 * sources, when the project has any) on the left, the selected table's
 * editable grid — or the selected source's info card — on the right (DbPane
 * owns the layout).
 */
export function DbSidebar({
  tables,
  selectedName,
  onSelect,
  sizeBytes,
  sources,
  selectedSourceName,
  onSelectSource,
}: DbSidebarProps) {
  return (
    <aside
      aria-label="Database tables"
      className="flex w-[32%] min-w-[8.5rem] max-w-[13rem] shrink-0 flex-col border-r border-pg-border bg-pg-surface-2"
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        <p className="px-1.5 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wide text-pg-text-muted">
          Tables
        </p>
        <ul className="space-y-0.5">
          {tables.map((table) => {
            const active = table.name === selectedName;
            return (
              <li key={table.name}>
                <button
                  type="button"
                  data-testid={`db-table-${table.name}`}
                  aria-pressed={active}
                  onClick={() => onSelect(table.name)}
                  className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] transition-colors ${
                    active
                      ? 'bg-brand-sky/15 font-extrabold text-pg-text'
                      : 'font-semibold text-pg-text-dim hover:bg-pg-text/10 hover:text-pg-text'
                  }`}
                >
                  <Table2
                    size={12}
                    aria-hidden
                    className={active ? 'shrink-0 text-brand-sky' : 'shrink-0 text-pg-text-muted'}
                  />
                  <span className="min-w-0 flex-1 truncate text-left font-mono">{table.name}</span>
                  <span className="shrink-0 text-[11px] font-semibold tabular-nums text-pg-text-muted">
                    {table.row_count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {/* Curated external data sources (D-WEB-19) — discovery lives right
            beside the tables; an empty catalog simply renders nothing. */}
        {sources.length > 0 && (
          <>
            <p className="px-1.5 pb-1 pt-2.5 text-[10px] font-bold uppercase tracking-wide text-pg-text-muted">
              Data sources
            </p>
            <ul className="space-y-0.5">
              {sources.map((source) => {
                const active = source.name === selectedSourceName;
                return (
                  <li key={source.name}>
                    <button
                      type="button"
                      data-testid={`db-source-${source.name}`}
                      aria-pressed={active}
                      onClick={() => onSelectSource(source.name)}
                      className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[12px] transition-colors ${
                        active
                          ? 'bg-brand-sky/15 font-extrabold text-pg-text'
                          : 'font-semibold text-pg-text-dim hover:bg-pg-text/10 hover:text-pg-text'
                      }`}
                    >
                      <Globe
                        size={12}
                        aria-hidden
                        className={active ? 'shrink-0 text-brand-sky' : 'shrink-0 text-pg-text-muted'}
                      />
                      <span className="min-w-0 flex-1 truncate text-left font-mono">
                        {source.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
      {/* The db's identity — the same virtual file the code explorer pins. */}
      <p
        data-testid="db-file-identity"
        className="shrink-0 truncate border-t border-pg-border px-2.5 py-1.5 text-[10px] font-semibold text-pg-text-muted"
      >
        <span className="font-mono">database.sqlite</span>
        {sizeBytes !== null && <span> · {formatDbSize(sizeBytes)}</span>}
      </p>
    </aside>
  );
}
