// Game Guide types (PRD learn-game-studio-help-prd.md). The CONTENT now lives in
// platform-backend (`src/help/help-content.ts`, the D-HELP-02 single source) and
// is fetched via `GET /help/docs`; this file is the shared SHAPE the pane renders.

export type Tier = 'lite' | 'pro';
export type Pillar = 'engine' | 'basics' | 'phaser';

export type HelpBlock =
  | { kind: 'heading'; text: string; anchor: string; tier?: Tier }
  | { kind: 'para'; text: string; tier?: Tier }
  | { kind: 'list'; items: string[]; tier?: Tier }
  | { kind: 'code'; code: string; tier?: Tier }
  | { kind: 'callout'; text: string; tier?: Tier }
  // `diagram` names an SVG (rendered by helpDiagrams.tsx); `alt` is the accessible
  // label and is indexed for search.
  | { kind: 'diagram'; diagram: string; alt: string; tier?: Tier };

export interface HelpDoc {
  id: string;
  pillar: Pillar;
  title: string;
  tags: string[];
  blocks: HelpBlock[];
}

export interface PillarMeta {
  id: Pillar;
  title: string;
  blurb: string;
}

/** The whole corpus, as returned by `GET /help/docs`. */
export interface HelpCorpus {
  pillars: PillarMeta[];
  docs: HelpDoc[];
}

/** A client-side search hit (the pane's own search). */
export interface HelpResult {
  id: string;
  pillar: Pillar;
  title: string;
  anchor?: string;
  snippet: string;
  score: number;
}
