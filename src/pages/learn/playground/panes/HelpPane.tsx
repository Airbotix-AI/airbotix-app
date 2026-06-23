// The Game Guide pane (PRD `learn-game-studio-help-prd.md` §4 / HJ1) — the
// in-studio help reader. Used identically by Window mode (the "Guide" floating
// window) and Split mode (the "Guide" tab). A left nav (pillars → docs) with a
// search box, and a reader that renders the doc's blocks filtered to the current
// reading tier (Lite 8–11 / Pro 12–17, defaulting to the kid's studio mode, with
// a manual toggle). No network, no LLM, no Stars — pure reading (D‑HELP‑01).
//
// The kid's search runs CLIENT-SIDE over the already-loaded corpus (helpApi), so
// the query never leaves the device (HJ5). The MH2 AI path will call an imperative
// `navigate(docId, anchor)` here when the agent emits `open_help`; for MH1 the kid
// drives navigation by clicking the nav or a search result.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { BookOpen, Loader2, Search } from 'lucide-react';

import { readWorkspaceSlice, writeWorkspaceSlice } from '../workspaceUiStore';
import { getDoc, loadHelpCorpus, searchDocs } from './help/helpApi';
import { HelpDiagram } from './help/helpDiagrams';
import type { HelpBlock, HelpDoc, HelpResult, Tier } from './help/helpTypes';

/**
 * Order a branch's docs by `order` and group consecutive docs by `section` (the
 * 3-level tree: branch → section → doc). Docs with no section render directly.
 */
function groupBySection(docs: HelpDoc[]): { section?: string; docs: HelpDoc[] }[] {
  const sorted = [...docs].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  const groups: { section?: string; docs: HelpDoc[] }[] = [];
  for (const d of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.section === d.section) last.docs.push(d);
    else groups.push({ section: d.section, docs: [d] });
  }
  return groups;
}

interface HelpPaneProps {
  /** The kid's studio mode → the default reading tier (Lite 8–11 / Pro 12–17). */
  mode: 'lite' | 'pro';
  /**
   * An external request to open a doc (+ optional anchor) — the agent's `open_help`
   * client action (MH2). The monotonic `nonce` lets a repeat jump to the same place
   * re-fire (a new object identity each time). Mirrors the editor's jump-to-error seam.
   */
  request?: { docId: string; anchor?: string; nonce: number };
}

/** Persisted Guide UI (resume where the kid left off, per project session). */
interface HelpSlice {
  docId: string;
  tier: Tier;
}

const DEFAULT_DOC = 'start/what-is-a-game';

/** Below this pane width the two-column layout reads badly — collapse to a
 *  single column: the reader full-width, with a "Topics" toggle in the header
 *  (mobile-docs style). The Guide can spawn in a narrow chat-respecting column
 *  and users can resize it arbitrarily, so this must look good at any width. */
const NARROW_PANE_PX = 480;

export function HelpPane({ mode, request }: HelpPaneProps) {
  const saved = readWorkspaceSlice<HelpSlice>('help', { docId: DEFAULT_DOC, tier: mode });
  const [tier, setTier] = useState<Tier>(saved.tier);
  const [docId, setDocId] = useState<string>(saved.docId);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setNarrow(el.clientWidth > 0 && el.clientWidth < NARROW_PANE_PX);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  // The corpus is the backend's single source — fetched once via GET /help/docs
  // and rendered/searched client-side (the kid's query never leaves the device).
  const corpus = useQuery({ queryKey: ['help-corpus'], queryFn: loadHelpCorpus, staleTime: Infinity });
  const docs = useMemo(() => corpus.data?.docs ?? [], [corpus.data]);
  const pillars = corpus.data?.pillars ?? [];
  const doc = getDoc(docs, docId);
  const results = useMemo(() => searchDocs(docs, query, tier), [docs, query, tier]);
  const searching = query.trim().length > 0;

  // Resume slice — persist the open doc + tier (real project sessions only; the
  // workspace store decides whether a project-less session persists).
  useEffect(() => {
    writeWorkspaceSlice('help', { docId, tier });
  }, [docId, tier]);

  // Scroll the reader to a heading anchor when one is requested (search result
  // with an anchor, or — later, MH2 — an agent `open_help`).
  const readerRef = useRef<HTMLDivElement>(null);
  const [pendingAnchor, setPendingAnchor] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!pendingAnchor || !readerRef.current) return;
    const el = readerRef.current.querySelector(`[data-anchor="${pendingAnchor}"]`);
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setPendingAnchor(undefined);
  }, [pendingAnchor, docId]);

  const open = (id: string, anchor?: string) => {
    setDocId(id);
    setQuery('');
    setShowTopics(false); // narrow mode: picking a topic returns to the reader
    if (anchor) setPendingAnchor(anchor);
    else readerRef.current?.scrollTo({ top: 0 });
  };

  // React to an external open request (the agent's `open_help`, via Workspace). The
  // `request` object identity changes per nonce, so this fires exactly once per jump
  // (and once on mount if a request is already present). Setters are stable → no churn.
  useEffect(() => {
    if (!request) return;
    setDocId(request.docId);
    setQuery('');
    if (request.anchor) setPendingAnchor(request.anchor);
    else readerRef.current?.scrollTo({ top: 0 });
  }, [request]);

  return (
    <div ref={rootRef} className="flex h-full min-h-0 bg-pg-bg text-pg-text" data-testid="help-pane" data-narrow={narrow || undefined}>
      {/* ── Left: search + nav (narrow mode: a full-width TOPICS view, toggled
          from the reader header — two cramped columns read badly) ──────────── */}
      <nav
        className={clsx(
          'flex shrink-0 flex-col bg-pg-surface',
          narrow ? (showTopics ? 'w-full' : 'hidden') : 'w-48 border-r border-pg-border',
        )}
      >
        <div className="border-b border-pg-border p-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-pg-border bg-pg-bg px-2">
            <Search size={14} className="shrink-0 text-pg-text-muted" />
            <input
              data-testid="help-search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the guide…"
              aria-label="Search the guide"
              className="w-full bg-transparent py-1.5 text-[13px] text-pg-text outline-none placeholder:text-pg-text-muted"
            />
          </div>
        </div>

        <div className="pg-scroll min-h-0 flex-1 overflow-y-auto p-2">
          {corpus.isPending ? (
            <div className="flex items-center gap-2 px-1.5 py-2 text-[13px] text-pg-text-muted">
              <Loader2 size={14} className="animate-spin text-brand-sunshine" /> Loading the guide…
            </div>
          ) : corpus.isError ? (
            <p className="px-1.5 py-2 text-[13px] text-pg-text-muted">
              Couldn&apos;t load the guide. Check your connection and try again.
            </p>
          ) : searching ? (
            <SearchResults results={results} onOpen={open} />
          ) : (
            [...pillars]
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((p) => (
                <div key={p.id} className="mb-3">
                  <div
                    data-testid={`help-nav-${p.id}`}
                    className="px-1.5 pb-1 text-[11px] font-extrabold uppercase tracking-wide text-pg-text-muted"
                  >
                    {p.title}
                  </div>
                  {groupBySection(docs.filter((d) => d.pillar === p.id)).map((group) => (
                    <div key={group.section ?? '_'}>
                      {group.section && (
                        <div className="px-1.5 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-pg-text-muted/70">
                          {group.section}
                        </div>
                      )}
                      <ul className="flex flex-col gap-0.5">
                        {group.docs.map((d) => (
                          <li key={d.id}>
                            <button
                              type="button"
                              data-testid={`help-nav-doc-${d.id}`}
                              aria-current={d.id === docId}
                              onClick={() => open(d.id)}
                              className={clsx(
                                'w-full rounded-md px-1.5 py-1 text-left text-[13px] transition-colors',
                                d.id === docId
                                  ? 'bg-brand-sunshine/20 font-bold text-pg-text'
                                  : 'font-medium text-pg-text-dim hover:bg-pg-text/5 hover:text-pg-text',
                              )}
                            >
                              {d.title}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))
          )}
        </div>
      </nav>

      {/* ── Right: reader ──────────────────────────────────────────────────── */}
      <section className={clsx('flex min-h-0 min-w-0 flex-1 flex-col', narrow && showTopics && 'hidden')}>
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-pg-border bg-pg-surface px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            {narrow && (
              <button
                type="button"
                data-testid="help-topics-toggle"
                onClick={() => setShowTopics(true)}
                className="flex shrink-0 items-center gap-1 rounded-full border border-pg-border px-2 py-1 text-[12px] font-bold text-pg-text-dim transition-colors hover:text-pg-text"
              >
                ☰ Topics
              </button>
            )}
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand-sunshine text-ink">
              <BookOpen size={14} />
            </span>
            <span className="truncate text-[14px] font-extrabold">{doc?.title ?? 'Game Guide'}</span>
          </div>
          <TierToggle tier={tier} onChange={setTier} />
        </header>

        <div ref={readerRef} data-testid="help-reader" className="pg-scroll min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {doc ? (
            <article className="mx-auto flex max-w-2xl flex-col gap-3 pb-8">
              {doc.blocks
                .filter((b) => !b.tier || b.tier === tier)
                .map((b, i) => (
                  <Block key={i} block={b} />
                ))}
            </article>
          ) : (
            <p className="text-pg-text-muted">Pick a topic on the left to start reading.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function SearchResults({
  results,
  onOpen,
}: {
  results: HelpResult[];
  onOpen: (id: string, anchor?: string) => void;
}) {
  if (results.length === 0) {
    return (
      <p data-testid="help-empty" className="px-1.5 py-2 text-[13px] text-pg-text-muted">
        No matches — try another word, like “jump”, “score” or “move”.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {results.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            data-testid={`help-result-${r.id}`}
            onClick={() => onOpen(r.id, r.anchor)}
            className="w-full rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-pg-text/5"
          >
            <span className="block text-[13px] font-bold text-pg-text">{r.title}</span>
            <span className="block text-[11.5px] leading-snug text-pg-text-muted">{r.snippet}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function TierToggle({ tier, onChange }: { tier: Tier; onChange: (t: Tier) => void }) {
  return (
    <div
      data-testid="help-tier-toggle"
      role="radiogroup"
      aria-label="Reading level"
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-pg-text/5 p-0.5"
    >
      {(['lite', 'pro'] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={tier === t}
          data-testid={`help-tier-${t}`}
          onClick={() => onChange(t)}
          className={clsx(
            'rounded-md px-2.5 py-1 text-[12px] font-bold capitalize transition-colors',
            tier === t ? 'bg-pg-surface text-pg-text shadow-sm' : 'text-pg-text-dim hover:text-pg-text',
          )}
        >
          {t === 'lite' ? 'Simple' : 'More'}
        </button>
      ))}
    </div>
  );
}

/** Render one content block. Plain React — no markdown/HTML injection. */
function Block({ block }: { block: HelpBlock }) {
  switch (block.kind) {
    case 'heading':
      return (
        <h3
          data-anchor={block.anchor}
          data-testid={`help-anchor-${block.anchor}`}
          className="scroll-mt-2 pt-1 text-[16px] font-extrabold text-pg-text"
        >
          {block.text}
        </h3>
      );
    case 'para':
      return <p className="text-[14px] leading-relaxed text-pg-text-dim">{block.text}</p>;
    case 'list':
      return (
        <ul className="ml-4 flex list-disc flex-col gap-1 text-[14px] leading-relaxed text-pg-text-dim">
          {block.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-lg border border-pg-border bg-pg-text/5 p-3 text-[12.5px] leading-relaxed text-pg-text">
          <code>{block.code}</code>
        </pre>
      );
    case 'callout':
      return (
        <div className="flex items-start gap-2 rounded-lg border border-brand-sunshine/40 bg-brand-sunshine/10 p-3 text-[13.5px] font-medium text-pg-text">
          <span>💡 {block.text}</span>
        </div>
      );
    case 'diagram':
      return <HelpDiagram diagram={block.diagram} alt={block.alt} />;
  }
}
