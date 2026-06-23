// Game Guide types (PRD learn-game-studio-help-prd.md). The CONTENT now lives in
// platform-backend (`src/help/help-content.ts`, the D-HELP-02 single source) and
// is fetched via `GET /help/docs`; this file is the shared SHAPE the pane renders.

export type Tier = 'lite' | 'pro';
// Concept BRANCHES (the KB is concept-first + engine-agnostic — learn-game-studio-help-prd
// §3 / D-HELP-08): each doc teaches an idea for BOTH 2D and 3D and only refers to Phaser 4 /
// three.js for implementation details. NOT engine pillars.
export type Pillar = 'start' | 'world' | 'motion' | 'rules' | 'polish';

export type HelpBlock =
  | { kind: 'heading'; text: string; anchor: string; tier?: Tier }
  | { kind: 'para'; text: string; tier?: Tier }
  | { kind: 'list'; items: string[]; tier?: Tier }
  | { kind: 'code'; code: string; tier?: Tier }
  | { kind: 'callout'; text: string; tier?: Tier }
  // `diagram` names a picture (rendered by helpDiagrams.tsx — static SVG OR an
  // interactive widget); `alt` is the accessible label and is indexed for search.
  | { kind: 'diagram'; diagram: string; alt: string; tier?: Tier };

export interface HelpDoc {
  id: string;
  pillar: Pillar;
  /** Optional sub-group within a branch (3-level tree: branch → section → doc). */
  section?: string;
  /** Step within the branch — the learning order; lower comes first. */
  order?: number;
  title: string;
  tags: string[];
  blocks: HelpBlock[];
}

export interface PillarMeta {
  id: Pillar;
  title: string;
  blurb: string;
  /** Order of the branch in the nav / learning path. */
  order: number;
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
