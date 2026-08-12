// Game Guide types (PRD learn-game-studio-help-prd.md). The CONTENT now lives in
// platform-backend (`src/help/help-content.ts`, the D-HELP-02 single source) and
// is fetched via `GET /help/docs`; this file is the shared SHAPE the pane renders.

export type Tier = 'lite' | 'pro';

/** Which studio a doc/pillar belongs to (creative-code-studio-website-prd D-WEB-21).
 *  The backend filters `GET /help/docs?kind=` by this; the pane passes the project
 *  kind. No param → `game` (back-compat). */
export type HelpKind = 'game' | 'website';

// Concept BRANCHES (the KB is concept-first + engine-agnostic — learn-game-studio-help-prd
// §3 / D-HELP-08): each doc teaches an idea for BOTH 2D and 3D and only refers to Phaser 4 /
// three.js for implementation details. NOT engine pillars.
export type GamePillar = 'start' | 'world' | 'motion' | 'rules' | 'polish';
// Website Studio branches (D-WEB-21): the pieces of a site + how they talk to each other.
export type WebsitePillar = 'frontend' | 'backend' | 'database' | 'data-sources' | 'communication';
export type Pillar = GamePillar | WebsitePillar;

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
  /** The studio this doc belongs to (D-WEB-21). Optional: the server already
   *  filters by `?kind=`, so the pane never re-filters — this is a shape mirror
   *  of the backend content (the game corpus predates the field). */
  kind?: HelpKind;
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
  /** The studio this pillar belongs to (D-WEB-21) — see `HelpDoc.kind`. Optional
   *  for the same back-compat reason. */
  kind?: HelpKind;
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
