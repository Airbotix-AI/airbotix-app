// Game Guide data access (PRD learn-game-studio-help-prd.md §4.2 / §5.1 / MH0).
//
// The corpus is the backend's single source of truth (D-HELP-02): `loadHelpCorpus`
// fetches the whole corpus once via `GET /help/docs` (small — sent whole so the
// pane renders + searches it CLIENT-SIDE, keeping the kid's query on the device,
// HJ5). Search ranking mirrors the backend `HelpSearchService` so the pane's own
// search and the agent's `search_help` tool agree.

import { api } from '@/lib/api';

import type { HelpBlock, HelpCorpus, HelpDoc, HelpResult, Tier } from './helpTypes';

export type { HelpBlock, HelpCorpus, HelpDoc, HelpResult, Tier } from './helpTypes';

/** Fetch the whole Game Guide corpus (pillars + docs) from the backend. */
export async function loadHelpCorpus(): Promise<HelpCorpus> {
  return api<HelpCorpus>('/help/docs');
}

/** Find a doc by id in a loaded corpus. */
export function getDoc(docs: HelpDoc[], id: string): HelpDoc | undefined {
  return docs.find((d) => d.id === id);
}

/** The full searchable text of a doc (title + tags + visible blocks), for a tier. */
function searchText(d: HelpDoc, tier?: Tier): string {
  const parts: string[] = [d.title, ...d.tags];
  for (const b of d.blocks) {
    if (tier && b.tier && b.tier !== tier) continue;
    if (b.kind === 'list') parts.push(...b.items);
    else if (b.kind === 'code') parts.push(b.code);
    else if (b.kind === 'diagram') parts.push(b.alt);
    else parts.push(b.text);
  }
  return parts.join(' \n ').toLowerCase();
}

/** First heading anchor visible at `tier` — the default jump target for a hit. */
function firstAnchor(d: HelpDoc, tier?: Tier): string | undefined {
  return d.blocks.find(
    (b): b is Extract<HelpBlock, { kind: 'heading' }> =>
      b.kind === 'heading' && (!tier || !b.tier || b.tier === tier),
  )?.anchor;
}

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
 * Lexical search over a loaded corpus (the kid's pane search). Punctuation-stripped
 * terms (≥2 chars) so "how do I jump?" matches the "jump" tag; TITLE and TAG hits
 * outrank body hits. Kept in sync with the backend `HelpSearchService` tokenizer +
 * ranking. Empty/too-short query → [].
 */
export function searchDocs(docs: HelpDoc[], query: string, tier?: Tier, limit = 8): HelpResult[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]+/g, ''))
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return [];

  const hits: HelpResult[] = [];
  for (const d of docs) {
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
      hits.push({
        id: d.id,
        pillar: d.pillar,
        title: d.title,
        anchor: firstAnchor(d, tier),
        snippet: snippet(d, terms, tier),
        score,
      });
    }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
