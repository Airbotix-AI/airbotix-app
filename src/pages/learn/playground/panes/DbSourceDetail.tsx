// The Database window's RIGHT panel when a DATA SOURCE is selected
// (creative-code-studio-website-prd D-WEB-19): a kid-readable info card for
// one curated external data source — what it is, the params it takes, the
// ready-to-copy `await sources.get(...)` example line, and a "Try it" button
// that runs the example params through the REAL server proxy and pretty-prints
// the JSON result (or the backend's kid-readable error) right there. Trying a
// source is a READ, so readOnly viewers (teacher/parent) may use it too —
// DbPane never gates this card. It also teaches the OPEN door (D-WEB-23): a
// copyable `await sources.fetch('https://…')` line — any public API, not just
// the curated shelf.

import { Check, Copy, Globe, Loader2, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '@/lib/api';
import {
  fetchProjectSource,
  type ProjectSourceInfo,
  type SiteSourceParam,
} from './playgroundApi';

/** How long the "Copied!" tick shows before the chip returns to Copy. */
const COPIED_RESET_MS = 1500;

/** The open-door teaching line (D-WEB-23): the catalog is the convenience
 *  shelf — `sources.fetch` reaches ANY public https JSON API through the same
 *  server proxy. Ready to copy, exactly like each source's `example_code`. */
export const OPEN_FETCH_EXAMPLE = "await sources.fetch('https://api.example.com/data')";

interface DbSourceDetailProps {
  source: ProjectSourceInfo;
  /** The backend project whose source proxy answers "Try it" (D-WEB-19).
   *  Absent in a project-less session — the button stays disabled. */
  projectId?: string;
}

/** A copyable one-line code chip (the `example_code` pattern) — used for the
 *  source's own example AND the open `sources.fetch` teaching line. */
function CopyableCode({ code, testId, label }: { code: string; testId: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    [],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    } catch {
      /* clipboard blocked (headless) — the line is still visible + selectable */
    }
  };

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-pg-border bg-pg-surface-2 px-2 py-1.5">
      <code data-testid={testId} className="min-w-0 flex-1 truncate font-mono text-[11px] text-pg-text">
        {code}
      </code>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => void onCopy()}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text"
      >
        {copied ? <Check size={12} aria-hidden className="text-brand-mint" /> : <Copy size={12} aria-hidden />}
      </button>
    </div>
  );
}

/** The example params for "Try it": every catalog param's example value (the
 *  same call the `example_code` line teaches). */
function exampleParams(source: ProjectSourceInfo): Record<string, SiteSourceParam> {
  const params: Record<string, SiteSourceParam> = {};
  for (const p of source.params) params[p.name] = p.example;
  return params;
}

/**
 * One data source's info card — description, params table, copyable example
 * line, and the live "Try it" runner. Mount with `key={source.name}` so a
 * source switch starts from a clean idle state.
 */
export function DbSourceDetail({ source, projectId }: DbSourceDetailProps) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onTry = async () => {
    if (!projectId || busy) return;
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const { data } = await fetchProjectSource(projectId, source.name, exampleParams(source));
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      // SOURCE_* messages are kid-readable — surface them verbatim.
      setError(
        err instanceof ApiError && err.message
          ? err.message
          : 'That data source could not be reached — try again in a moment.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="db-source-detail"
      className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-3"
    >
      <div className="flex items-center gap-2">
        <Globe size={16} aria-hidden className="text-brand-sky" />
        <h3 className="font-mono text-[14px] font-extrabold text-pg-text">{source.name}</h3>
      </div>
      <p className="text-[12px] leading-snug text-pg-text-dim">{source.description}</p>

      {source.params.length > 0 && (
        <table className="w-full text-left text-[11px]">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wide text-pg-text-muted">
              <th className="py-1 pr-2 font-bold">Param</th>
              <th className="py-1 pr-2 font-bold">What it is</th>
              <th className="py-1 pr-2 font-bold">Required</th>
              <th className="py-1 font-bold">Example</th>
            </tr>
          </thead>
          <tbody>
            {source.params.map((p) => (
              <tr key={p.name} className="border-t border-pg-border align-top">
                <td className="py-1 pr-2 font-mono font-semibold text-pg-text">{p.name}</td>
                <td className="py-1 pr-2 text-pg-text-dim">{p.description}</td>
                <td className="py-1 pr-2 text-pg-text-muted">{p.required ? 'yes' : 'no'}</td>
                <td className="py-1 font-mono text-pg-text-dim">{p.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* The ready-to-copy call — exactly what kid code (or the AI) writes. */}
      <CopyableCode code={source.example_code} testId="db-source-example" label="Copy example code" />

      {/* The open door (D-WEB-23): the catalog is only the convenience shelf. */}
      <div>
        <p data-testid="db-source-fetch-hint" className="mb-1.5 text-[11px] leading-snug text-pg-text-dim">
          You can also fetch <span className="font-semibold">any public API</span>, not just these
          sources:
        </p>
        <CopyableCode
          code={OPEN_FETCH_EXAMPLE}
          testId="db-source-fetch-example"
          label="Copy sources.fetch example"
        />
      </div>

      <div>
        <button
          type="button"
          data-testid="db-source-try"
          disabled={busy || !projectId}
          onClick={() => void onTry()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-pg-border px-2.5 py-1 text-[11px] font-bold text-pg-text-dim transition-colors hover:bg-pg-text/10 hover:text-pg-text disabled:opacity-60"
        >
          {busy ? <Loader2 size={11} aria-hidden className="animate-spin" /> : <Play size={11} aria-hidden />}
          {busy ? 'Asking…' : 'Try it'}
        </button>
      </div>

      {result !== null && (
        <pre
          data-testid="db-source-result"
          className="max-h-48 overflow-auto rounded-md bg-pg-desktop p-2 font-mono text-[11px] leading-snug text-pg-text-dim"
        >
          {result}
        </pre>
      )}
      {error !== null && (
        <p data-testid="db-source-error" className="text-[11px] font-semibold text-brand-coral">
          {error}
        </p>
      )}
    </div>
  );
}
