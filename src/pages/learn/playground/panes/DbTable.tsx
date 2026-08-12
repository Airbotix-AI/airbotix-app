// The Database window's RIGHT panel: ONE table — the master–detail selection
// (D-WEB-18) — rendered EDITABLE (creative-code-studio-website-prd D-WEB-16):
// `name · N rows` heading, real columns (type shown subtly, sticky header row),
// the first rows, plus kid-friendly edits keyed by SQLite's rowid (each
// introspected row carries `__rowid__`; never a display column): click a cell
// to change it, "+ Add row", and a two-step row delete.
// Every write runs through the SAME `POST /projects/:id/db/query` the site's own
// server.js uses (parameterized — the backend binds values and enforces access),
// then re-introspects, so the pane always shows server truth. Tables without a
// usable rowid render read-only with a one-line note; readOnly (teacher/parent)
// viewers get NO edit affordances at all (same gate as Reset database).

import { Check, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';
import { DB_ROWS_DISPLAY_LIMIT, useSiteDbStore, type SiteDbTableSnapshot } from '../siteDbStore';
import {
  querySiteDb,
  SITE_DB_ROWID_KEY,
  type SiteDbColumn,
  type SiteDbParam,
} from './playgroundApi';

/** Longest rendered cell value — the pane is a window, not a data dump. */
const VALUE_CLIP_CHARS = 120;
/** An armed row-delete disarms itself after this long without the second click. */
const DELETE_CONFIRM_MS = 5000;

/** Quote a SQL identifier — names come from introspection, but quote
 *  defensively anyway (`"` wrapping, embedded quotes doubled). */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Kid-readable stringification of one db cell, clipped. */
function renderValue(v: unknown): string {
  let s: string;
  if (typeof v === 'string') s = v;
  else {
    try {
      s = JSON.stringify(v) ?? String(v);
    } catch {
      s = String(v);
    }
  }
  return s.length > VALUE_CLIP_CHARS ? `${s.slice(0, VALUE_CLIP_CHARS)}…` : s;
}

/** The editable text a cell edit starts from (NULL edits as empty). UNCLIPPED
 *  — clipping is display-only; seeding the draft from the clipped render would
 *  silently truncate a long value on save. */
function editText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

/** An `id INTEGER` column is left out of inserts so SQLite assigns the id. */
function isAutoId(c: SiteDbColumn): boolean {
  return c.name.toLowerCase() === 'id' && /int/i.test(c.type);
}

/** Add-row placeholder value: empty string for text-affinity columns, NULL
 *  otherwise (numbers get typed in afterwards; NULL never fails affinity). */
function emptyValueFor(c: SiteDbColumn): SiteDbParam {
  return /char|text|clob/i.test(c.type) ? '' : null;
}

/** The backend's kid-readable message when it sent one; a calm fallback else. */
function kidMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError && err.message ? err.message : fallback;
}

const CELL = 'border-b border-pg-border px-2 py-1 align-top font-mono text-[12px]';

interface DbTableProps {
  table: SiteDbTableSnapshot;
  /** The backend project whose db this table edits (writes need it). */
  projectId?: string;
  /** Teacher/parent read-only viewer — NO edit affordances at all. */
  readOnly: boolean;
}

/**
 * One server-side table (the selected one): heading + rows and — for a kid
 * viewer on a rowid-keyed table — inline cell edit / add row / delete row.
 */
export function DbTable({ table, projectId, readOnly }: DbTableProps) {
  const { name, row_count: rowCount, columns, rows, hasRowid } = table;
  const refresh = useSiteDbStore((s) => s.refresh);
  const editable = !readOnly && hasRowid && !!projectId;

  // The cell being edited (keyed by rowid+column, NOT row index — the ~2s poll
  // can reorder/refresh rows under an open editor without stealing it).
  // `original` is the full text the edit started from: an unchanged Enter is a
  // no-op close, never a write.
  const [editing, setEditing] = useState<{ rowid: string; col: string; original: string } | null>(
    null,
  );
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  // The last failed write's kid-readable message — one inline line, no toasts.
  const [editError, setEditError] = useState<string | null>(null);
  // Two-step delete: the armed row's rowid (same pattern as Reset database).
  const [armedDelete, setArmedDelete] = useState<string | null>(null);
  // A just-added row's rowid — focus its first cell once the refresh shows it.
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const disarmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
    },
    [],
  );

  const rowidOf = (row: Record<string, unknown>): string | null => {
    const v = row[SITE_DB_ROWID_KEY];
    if (typeof v === 'string') return v;
    if (typeof v === 'number') return String(v);
    return null;
  };

  /** Run ONE parameterized write, then re-introspect so the pane shows server
   *  truth. A failure surfaces inline and returns null (the display reverts —
   *  the snapshot was never touched). */
  const runWrite = async (
    sql: string,
    params: SiteDbParam[],
    fallback: string,
  ): Promise<{ last_insert_rowid: string | null } | null> => {
    if (!projectId) return null;
    try {
      const res = await querySiteDb(projectId, sql, params);
      setEditError(null);
      await refresh(projectId);
      return res;
    } catch (err) {
      setEditError(kidMessage(err, fallback));
      return null;
    }
  };

  const startEdit = (rowid: string, col: string, value: unknown) => {
    setArmedDelete(null);
    setEditError(null); // a previous failure's message is stale once a new edit starts
    const original = editText(value);
    setEditing({ rowid, col, original });
    setDraft(original);
  };

  // Enter saves; the value goes as typed (a number typed into the text input
  // passes through — SQLite column affinity converts it server-side).
  const saveCell = async () => {
    const saved = editing;
    if (!saved || saving) return;
    if (draft === saved.original) {
      setEditing((e) => (e === saved ? null : e)); // nothing changed — no write
      return;
    }
    setSaving(true);
    await runWrite(
      `UPDATE ${quoteIdent(name)} SET ${quoteIdent(saved.col)} = ? WHERE rowid = ?`,
      [draft, saved.rowid],
      "That change didn't save — try again in a moment.",
    );
    setSaving(false);
    // Close only the cell THIS save was for (success shows the refreshed
    // value; failure reverts) — never an editor the kid has since moved to.
    setEditing((e) => (e === saved ? null : e));
  };

  const addRow = async () => {
    // Leave an `id INTEGER` column out so SQLite assigns the id; everything
    // else starts as ''/NULL for the kid to fill in.
    const insertCols = columns.filter((c) => !isAutoId(c));
    const sql = insertCols.length
      ? `INSERT INTO ${quoteIdent(name)} (${insertCols.map((c) => quoteIdent(c.name)).join(', ')}) VALUES (${insertCols.map(() => '?').join(', ')})`
      : `INSERT INTO ${quoteIdent(name)} DEFAULT VALUES`;
    const res = await runWrite(
      sql,
      insertCols.map(emptyValueFor),
      "The new row didn't save — try again in a moment.",
    );
    // Arm the focus only if the post-insert refresh actually shows the new row
    // (a row beyond the display limit must not leave a stale pending focus that
    // pops an editor open minutes later when it scrolls into the window).
    if (res?.last_insert_rowid != null) {
      const snap = useSiteDbStore.getState().tables?.find((t) => t.name === name);
      if (snap?.rows.some((r) => rowidOf(r) === res.last_insert_rowid)) {
        setPendingFocus(res.last_insert_rowid);
      }
    }
  };

  // Once the refreshed snapshot shows the just-added row, open its first
  // fillable cell so the kid can start typing (best effort — a row beyond the
  // display limit simply stays unfocused).
  useEffect(() => {
    if (!pendingFocus) return;
    const row = rows.find((r) => rowidOf(r) === pendingFocus);
    if (!row) return;
    const col = columns.find((c) => !isAutoId(c)) ?? columns[0];
    if (col) startEdit(pendingFocus, col.name, row[col.name]);
    setPendingFocus(null);
    // Only react to fresh rows while a focus is pending.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, pendingFocus]);

  const onDeleteClick = async (rowid: string) => {
    if (armedDelete !== rowid) {
      setArmedDelete(rowid);
      setEditing(null);
      if (disarmTimer.current) clearTimeout(disarmTimer.current);
      disarmTimer.current = setTimeout(() => setArmedDelete(null), DELETE_CONFIRM_MS);
      return;
    }
    if (disarmTimer.current) clearTimeout(disarmTimer.current);
    setArmedDelete(null);
    await runWrite(
      `DELETE FROM ${quoteIdent(name)} WHERE rowid = ?`,
      [rowid],
      "That row didn't delete — try again in a moment.",
    );
  };

  return (
    <section className="flex h-full min-h-0 flex-col gap-1.5">
      <h3 className="shrink-0 text-[13px] font-extrabold text-pg-text">
        {name}
        <span className="font-semibold text-pg-text-muted">
          {' '}
          · {rowCount} {rowCount === 1 ? 'row' : 'rows'}
        </span>
      </h3>
      {rows.length === 0 ? (
        <p className="text-[12px] text-pg-text-muted">No rows yet.</p>
      ) : (
        // Both scroll axes live HERE so the sticky header row tracks the
        // grid's own vertical scroll (the pane around it never scrolls).
        <div className="min-h-0 overflow-auto rounded-lg border border-pg-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th
                    key={c.name}
                    className={`${CELL} sticky top-0 z-[1] bg-pg-surface-2 font-bold text-pg-text-dim`}
                  >
                    {c.name}
                    <span className="ml-1 font-medium lowercase text-pg-text-muted">{c.type}</span>
                  </th>
                ))}
                {editable && (
                  <th className={`${CELL} sticky top-0 z-[1] w-8 bg-pg-surface-2`}>
                    <span className="sr-only">Row actions</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const rowid = rowidOf(row);
                return (
                  <tr key={rowid ?? i}>
                    {columns.map((c) => {
                      const isEditing =
                        editable &&
                        rowid !== null &&
                        editing !== null &&
                        editing.rowid === rowid &&
                        editing.col === c.name;
                      return (
                        <td
                          key={c.name}
                          data-testid={`db-cell-${name}-${i}-${c.name}`}
                          className={`${CELL} text-pg-text`}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              aria-label={`Edit ${c.name}`}
                              value={draft}
                              disabled={saving}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void saveCell();
                                if (e.key === 'Escape') setEditing(null);
                              }}
                              onBlur={() => {
                                if (!saving) setEditing(null);
                              }}
                              className="w-full min-w-[6ch] rounded border border-brand-sky bg-pg-surface px-1 py-0.5 font-mono text-[12px] text-pg-text focus:outline-none disabled:opacity-60"
                            />
                          ) : editable && rowid !== null ? (
                            <button
                              type="button"
                              title="Click to edit"
                              onClick={() => startEdit(rowid, c.name, row[c.name])}
                              className="block w-full cursor-text rounded text-left transition-colors hover:bg-pg-text/5"
                            >
                              {c.name in row ? renderValue(row[c.name]) : ''}
                            </button>
                          ) : c.name in row ? (
                            renderValue(row[c.name])
                          ) : (
                            ''
                          )}
                        </td>
                      );
                    })}
                    {editable && (
                      <td className={`${CELL} w-8`}>
                        {rowid !== null && (
                          <button
                            type="button"
                            data-testid="db-delete-row"
                            aria-label={
                              armedDelete === rowid
                                ? `Really delete row ${i + 1}?`
                                : `Delete row ${i + 1}`
                            }
                            title={
                              armedDelete === rowid
                                ? 'Click again to delete this row'
                                : 'Delete this row'
                            }
                            onClick={() => void onDeleteClick(rowid)}
                            className={`rounded p-0.5 transition-colors ${
                              armedDelete === rowid
                                ? 'bg-wash-coral text-brand-coral'
                                : 'text-pg-text-muted hover:bg-wash-coral hover:text-brand-coral'
                            }`}
                          >
                            {armedDelete === rowid ? (
                              <Check size={12} aria-hidden />
                            ) : (
                              <Trash2 size={12} aria-hidden />
                            )}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {editable && (
        <button
          type="button"
          data-testid={`db-add-row-${name}`}
          onClick={() => void addRow()}
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-md px-1.5 py-0.5 text-[11px] font-bold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
        >
          <Plus size={11} aria-hidden /> Add row
        </button>
      )}
      {!readOnly && !hasRowid && (
        <p className="shrink-0 text-[11px] text-pg-text-muted">
          View-only: this table has no row ids, so it can't be edited here.
        </p>
      )}
      {editError && (
        <p
          data-testid={`db-edit-error-${name}`}
          className="shrink-0 text-[11px] font-semibold text-brand-coral"
        >
          {editError}
        </p>
      )}
      {rowCount > rows.length && (
        <p className="shrink-0 text-[11px] text-pg-text-muted">
          Showing the first {Math.min(rows.length, DB_ROWS_DISPLAY_LIMIT)} of {rowCount} rows.
        </p>
      )}
    </section>
  );
}
