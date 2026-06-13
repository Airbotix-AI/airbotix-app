// Try Demo Mode context (try-demo-mode-prd.md §2 D-DEMO-03). The public `/try/*`
// pages wrap the REAL studio components in this provider; the studios read it
// through `useDemoMode()`, which is `null` everywhere else — so every injection
// point in existing studio code defaults to "off" and is behaviour-neutral for
// the real product. This module deliberately imports NOTHING from the studios
// (no cycles): the API-adapter seams live in `demoAdapters.ts`.

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Where leaving a demo lands: the marketing site's "Try it" page (the demo's
 * entry point). Works out of the box in BOTH environments: production builds
 * go to airbotix.ai; dev builds go to the marketing dev server (it pins port
 * 3000 in its vite config). `VITE_MARKETING_URL` overrides either.
 */
const MARKETING_DEFAULT = import.meta.env.PROD ? 'https://airbotix.ai' : 'http://localhost:3000';
export const DEMO_EXIT_URL = `${import.meta.env.VITE_MARKETING_URL ?? MARKETING_DEFAULT}/try`;

/**
 * The studio's REAL affordances the Workspace registers for the tour (T1 v2,
 * try-demo-mode-prd §3). Every handler here IS the production one — the same
 * functions the editor's ▶ Play, the chat's changed-file rows, the selection
 * toolbar's "✨ Explain this" and the Asset Viewer's Generate/Remix call — so
 * the tour only sequences real behaviour, never re-implements it.
 */
export interface DemoStudioControls {
  /** The editor's ▶ Play path: run/restart the game + focus the Game Runner. */
  runGame: () => void;
  /** Open/focus a studio panel (window mode) or its split tab. */
  focusPanel: (target: 'chat' | 'code' | 'game' | 'assets' | 'help') => void;
  /** The changed-file-row jump: open the editor at a file + highlight lines.
   *  `select` selects the range through the real selection pipeline instead,
   *  surfacing the "✨ Explain this" floating toolbar. */
  openFileAt: (path: string, line: number, toLine?: number, select?: boolean) => void;
  /** The "✨ Explain this" toolbar path: send a snippet to chat for explaining. */
  explainSelection: (code: string) => void;
  /** The Asset Viewer's Generate/Remix entry (offline stub in a demo session). */
  requestAssetGen: (prompt: string, ref?: { refAssetPath?: string }) => void;
  /** The agent's `open_help` path: surface the Game Guide opened at a doc. */
  openGuide: (docId: string, anchor?: string) => void;
}

/**
 * The Asset Viewer pane's REAL affordances (T1 §3 step 7): the generate bar's
 * prompt state setter (the same one its input edits), the exact submit its
 * "✨ Generate" button calls, and the open-details path an asset-card tap runs.
 * The tour types into / submits through the real pane UI — never a re-build.
 */
export interface DemoAssetPaneControls {
  setGeneratePrompt: (prompt: string) => void;
  submitGenerate: () => void;
  openAssetDetails: (path: string) => void;
}

/** The asset details view's "Remix with AI" bar (same pattern): its real input
 *  state setter + the exact submit its "Remix" button calls. */
export interface DemoRemixControls {
  setPrompt: (prompt: string) => void;
  submit: () => void;
}

/**
 * The share control's REAL affordances (T1 §3 step 11 / T2 §4 — D-DEMO-09). The
 * `ShareLinkPanel` / `BlocksSharePanel` register these so the tour can walk the
 * real share flow: open the popup, fire the real "ask a grown-up" request
 * (→ pending), simulate the grown-up's approval (→ active — the ONE preview-
 * framed beat), and open the recipient view (a real new tab to the real
 * `/play/:shareId` page playing the bundled snapshot).
 */
export interface DemoShareControls {
  openPanel: () => void;
  requestShare: () => void;
  approve: () => void;
  openRecipient: () => void;
  /** Close the panel as the tour leaves the share beat, so its (high-z) popup
   *  no longer overlaps the free-explore card's controls. */
  closePanel: () => void;
}

export interface DemoMode {
  /** Which demo experience this provider hosts. */
  surface: 'playground' | 'blocks';
  /**
   * Where the studio's Home/exit affordance points in demo mode: back to the
   * marketing "Try it" page instead of the authed hub.
   */
  exitHref?: string;
  /**
   * T1 only (D-DEMO-04): the locked initial prompt. The REAL landing screen
   * pre-fills it, renders it read-only, and hides the inputs that could change
   * it (chips / mic) — the demo starts on the real landing phase.
   */
  lockedPrompt?: string;
  /**
   * T1 only (§3 step 1→2): Airo's canned first-build reply. The REAL
   * GeneratingScreen plays its scripted build through the real progress UI
   * (thinking → file-by-file → done) and this reply seeds the workspace chat,
   * exactly like a real streamed first turn.
   */
  firstTurnReply?: string;
  /**
   * T1 only (§3 step 1): the landing screen registers its real `submit` here so
   * the tour card's "Create the game" drives the REAL create flow.
   */
  bindLandingSubmit?: (submit: () => void) => void;
  /**
   * T2 only: the Blocks Studio registers its REAL ▶ Go handler here, so the
   * tour's "Press Go" card can press it for the user.
   */
  bindBlocksGo?: (go: () => void) => void;
  /**
   * T2 only: flag-run lifecycle. The tour spotlights the STAGE while the story
   * plays (whether Go was pressed by the user or by the tour) and advances
   * when the animation finishes.
   */
  onStoryRun?: (phase: 'start' | 'end') => void;
  /**
   * T1 only (D-DEMO-05): the Workspace registers its real chat `send` here so
   * the tour overlay's "Next" can drive the canned scripted turns through the
   * REAL chat pipeline (store funnel, undo, history — identical to a typed ask).
   */
  bindChatSend?: (send: (text: string) => void) => void;
  /**
   * T1 only (§3 v2): the Workspace registers its real studio affordances here
   * (run/restart, panel focus, editor jump, explain-this, asset generate) so the
   * tour can sequence them. First bind = the workspace has mounted.
   */
  bindStudioControls?: (controls: DemoStudioControls) => void;
  /**
   * T1 only (§3 step 7a): the Asset Viewer registers its real generate-bar +
   * details affordances here so the tour can type the wish into the REAL prompt
   * box and submit through the REAL Generate path. Re-bound on every render
   * (last bind wins) — the handlers always close over current pane state.
   */
  bindAssetPane?: (controls: DemoAssetPaneControls) => void;
  /**
   * T1 only (§3 step 7b): the details view's "Remix with AI" bar registers its
   * real input setter + submit here (it mounts with the details view).
   */
  bindAssetRemix?: (controls: DemoRemixControls) => void;
  /**
   * §3 step 11 / §4 (D-DEMO-09): the real share panel registers its open /
   * request / approve / open-recipient affordances so the tour can walk the
   * share flow on the real UI. Re-bound each render (last bind wins) so the
   * recipient opener always closes over the current share URL.
   */
  bindShareControls?: (controls: DemoShareControls) => void;
  /**
   * §3 step 11 / §4 (D-DEMO-09): the fixed project id the demo's share panel
   * uses. Playground runs project-less, so the demo supplies this id to surface
   * the real Share button (the in-memory share adapter intercepts its calls).
   */
  shareProjectId?: string;
}

const DemoModeContext = createContext<DemoMode | null>(null);

/** The demo flag the studios read. `null` (off) outside a `/try/*` page. */
// eslint-disable-next-line react-refresh/only-export-components
export function useDemoMode(): DemoMode | null {
  return useContext(DemoModeContext);
}

export function DemoModeProvider({ value, children }: { value: DemoMode; children: ReactNode }) {
  return <DemoModeContext.Provider value={value}>{children}</DemoModeContext.Provider>;
}
