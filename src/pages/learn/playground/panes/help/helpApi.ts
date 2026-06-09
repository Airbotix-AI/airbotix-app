// Game Guide data seam (PRD `learn-game-studio-help-prd.md` §4.2 / §5.1).
//
// For MH1 the corpus is the bundled `helpContent` and these helpers resolve it
// SYNCHRONOUSLY in-memory — no network. This is the single seam that MH0 swaps to
// the server-side source of truth (D‑HELP‑02): `listHelpDocs`→`GET /help/docs`,
// `getHelpDoc`→`GET /help/docs/:id` (then cache in IndexedDB). `searchHelp` is the
// kid's pane search today; MH2's backend `search_help` agent tool mirrors the same
// ranking server-side. Keeping it here means the swap touches ONE file.

import { HELP_DOCS, HELP_PILLARS, type HelpBlock, type HelpDoc, type Pillar, type Tier } from './helpContent';

/** Lightweight doc descriptor for the nav + search results (no block bodies). */
export interface HelpDocMeta {
  id: string;
  pillar: Pillar;
  title: string;
  tags: string[];
}

/** A search hit: the doc + the first anchor + a snippet + a score (higher = better). */
export interface HelpResult extends HelpDocMeta {
  anchor?: string;
  snippet: string;
  score: number;
}

export { HELP_PILLARS };
export type { HelpBlock, HelpDoc, Pillar, Tier };

const meta = (d: HelpDoc): HelpDocMeta => ({ id: d.id, pillar: d.pillar, title: d.title, tags: d.tags });

/** All docs (metadata only), in authored order. (MH0: `GET /help/docs`.) */
export function listHelpDocs(): HelpDocMeta[] {
  return HELP_DOCS.map(meta);
}

/** One doc by id, or undefined. (MH0: `GET /help/docs/:id` + IndexedDB cache.) */
export function getHelpDoc(id: string): HelpDoc | undefined {
  return HELP_DOCS.find((d) => d.id === id);
}

/** The full searchable text of a doc (title + tags + every block's text), for a
 *  given tier (blocks tagged for the OTHER tier are excluded so a Lite search
 *  doesn't surface Pro-only passages). */
function searchText(d: HelpDoc, tier?: Tier): string {
  const parts: string[] = [d.title, ...d.tags];
  for (const b of d.blocks) {
    if (tier && b.tier && b.tier !== tier) continue;
    if (b.kind === 'list') parts.push(...b.items);
    else if (b.kind === 'code') parts.push(b.code);
    else parts.push(b.text);
  }
  return parts.join(' \n ').toLowerCase();
}

/** The first heading anchor in a doc visible at `tier` — the default jump target. */
function firstAnchor(d: HelpDoc, tier?: Tier): string | undefined {
  return d.blocks.find(
    (b): b is Extract<typeof b, { kind: 'heading' }> =>
      b.kind === 'heading' && (!tier || !b.tier || b.tier === tier),
  )?.anchor;
}

/** A short snippet around the first query-term hit (or the doc's first prose). */
function snippet(d: HelpDoc, terms: string[], tier?: Tier): string {
  const prose = d.blocks.find(
    (b) => (b.kind === 'para' || b.kind === 'callout') && (!tier || !b.tier || b.tier === tier),
  );
  const text = prose && (prose.kind === 'para' || prose.kind === 'callout') ? prose.text : d.title;
  const lower = text.toLowerCase();
  const at = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - 30);
  const out = text.slice(start, start + 140);
  return (start > 0 ? '…' : '') + out + (start + 140 < text.length ? '…' : '');
}

/**
 * Lexical search over the corpus (D‑HELP‑04 / OQ‑H1: Postgres FTS in the backend;
 * here a deterministic in-memory ranker). Splits the query into terms and scores a
 * doc by where each term matches — TITLE and TAG hits outrank body hits. Returns
 * ranked metadata + the best anchor + a snippet. Empty query → [] (the nav, not a
 * result list, is the browse affordance).
 */
export function searchHelp(query: string, tier?: Tier, limit = 8): HelpResult[] {
  // Punctuation-stripped terms (≥2 chars) so "how do I jump?" matches the "jump"
  // tag (not "jump?"). Kept in sync with the backend HelpSearchService tokenizer.
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]+/g, ''))
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return [];

  const hits: HelpResult[] = [];
  for (const d of HELP_DOCS) {
    const title = d.title.toLowerCase();
    const tags = d.tags.map((t) => t.toLowerCase());
    const body = searchText(d, tier);
    let score = 0;
    for (const term of terms) {
      if (title.includes(term)) score += 10;
      if (tags.some((t) => t.includes(term))) score += 6;
      else if (body.includes(term)) score += 2;
    }
    if (score > 0) {
      hits.push({ ...meta(d), anchor: firstAnchor(d, tier), snippet: snippet(d, terms, tier), score });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
