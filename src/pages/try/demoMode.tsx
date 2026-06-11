// Try Demo Mode context (try-demo-mode-prd.md §2 D-DEMO-03). The public `/try/*`
// pages wrap the REAL studio components in this provider; the studios read it
// through `useDemoMode()`, which is `null` everywhere else — so every injection
// point in existing studio code defaults to "off" and is behaviour-neutral for
// the real product. This module deliberately imports NOTHING from the studios
// (no cycles): the API-adapter seams live in `demoAdapters.ts`.

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Where leaving a demo lands: the marketing site's "Try it" page (the demo's
 * entry point). Env-overridable for local dev (marketing runs on its own port).
 */
export const DEMO_EXIT_URL = `${import.meta.env.VITE_MARKETING_URL ?? 'https://airbotix.ai'}/try`;

export interface DemoMode {
  /** Which demo experience this provider hosts. */
  surface: 'playground' | 'blocks';
  /**
   * Where the studio's Home/exit affordance points in demo mode: back to the
   * marketing "Try it" page instead of the authed hub.
   */
  exitHref?: string;
  /**
   * T1 only (D-DEMO-04): the locked initial prompt. PlaygroundApp seeds its
   * prompt from this and opens straight into the build (no landing screen).
   */
  lockedPrompt?: string;
  /**
   * T1 only (D-DEMO-05): the Workspace registers its real chat `send` here so
   * the tour overlay's "Next" can drive the canned scripted turns through the
   * REAL chat pipeline (store funnel, undo, history — identical to a typed ask).
   */
  bindChatSend?: (send: (text: string) => void) => void;
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
