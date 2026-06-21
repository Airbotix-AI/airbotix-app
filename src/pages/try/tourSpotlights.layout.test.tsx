// @vitest-environment jsdom
// Layout-proof tour spotlights (try-demo-mode-prd §3): the REAL Workspace shell
// is rendered in BOTH layout modes — floating Windows (data-window on each
// window) and Split (data-pane on the tab region + the Game pane) — and every
// tour card's panel-level spotlight must resolve in each, after the engine
// focuses that panel the way `reveal`/`fireAction` do (focusPanel through the
// demo seam). Also covers the mid-tour Windows↔Split flip: the bound
// `focusPanel` routes per the LIVE layout, even when the tour holds a handler
// bound before the flip. The pane INTERNALS are stubbed (Monaco/Phaser don't
// run in jsdom) — element-level (`data-testid`) spotlights are covered by the
// host-panel convention test in demoTour.playground.test.ts plus the e2e walk.

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Workspace } from '../learn/playground/Workspace';
import { usePlaygroundStore, type PgWindowId } from '../learn/playground/playgroundStore';
import { useWorkspaceUiStore } from '../learn/playground/workspaceUiStore';
import { DemoModeProvider, type DemoMode, type DemoStudioControls } from './demoMode';
import { PLAYGROUND_TOUR, panelSpotlight } from './demoTour.playground';
import { spotlightPanel, type SpotlightPanelId } from './tourSequencing';

// Stub the heavy pane internals — the layout SHELL (windows, tab strip, panes'
// host regions) is what carries the spotlight seams under test.
vi.mock('../learn/playground/panes/ChatPane', () => ({ ChatPane: () => <div /> }));
vi.mock('../learn/playground/panes/CodeEditorPane', () => ({ CodeEditorPane: () => <div /> }));
vi.mock('../learn/playground/panes/GameRunnerPane', () => ({ GameRunnerPane: () => <div /> }));
vi.mock('../learn/playground/panes/AssetViewerPane', () => ({ AssetViewerPane: () => <div /> }));
vi.mock('../learn/playground/panes/HelpPane', () => ({ HelpPane: () => <div /> }));
vi.mock('../learn/playground/panes/useGameAgent', () => ({
  useGameAgent: () => ({
    chat: [],
    busy: false,
    streaming: null,
    progress: null,
    error: null,
    offline: false,
    pending: null,
    balance: undefined,
    canUndo: false,
    safeguard: null,
    handRaised: false,
    send: vi.fn(),
    requestAssetGen: vi.fn(),
    confirmPending: vi.fn(),
    cancelPending: vi.fn(),
    undo: vi.fn(),
    raiseHand: vi.fn(),
    lowerHand: vi.fn(),
    abort: vi.fn(),
    retryLast: vi.fn(),
    autoFixFromErrors: vi.fn(),
  }),
}));

const PANELS: SpotlightPanelId[] = ['chat', 'code', 'game', 'assets', 'help'];

// Pristine store snapshot — the playground store is module-level state.
const INITIAL = {
  layoutMode: usePlaygroundStore.getState().layoutMode,
  windows: JSON.parse(JSON.stringify(usePlaygroundStore.getState().windows)),
  topZ: usePlaygroundStore.getState().topZ,
};

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  usePlaygroundStore.setState({
    layoutMode: INITIAL.layoutMode,
    windows: JSON.parse(JSON.stringify(INITIAL.windows)),
    topZ: INITIAL.topZ,
  });
});

afterEach(() => {
  cleanup();
  useWorkspaceUiStore.getState().restore(null);
  vi.unstubAllGlobals();
});

function renderWorkspace(demo?: DemoMode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ws = (
    <Workspace
      files={[]}
      runKey={0}
      running={false}
      onApplyFiles={() => {}}
      onRun={() => {}}
      prompt=""
    />
  );
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        {demo ? <DemoModeProvider value={demo}>{ws}</DemoModeProvider> : ws}
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** All panel-level tour spotlights (the layout-proof pairs) by host panel. */
const panelCards = PLAYGROUND_TOUR.filter(
  (c) => c.spotlight?.includes('data-window') || c.spotlight?.includes('data-pane'),
);

describe('tour spotlights across both Workspace layouts', () => {
  it('Window mode: every panel spotlight resolves once its window is focused', () => {
    renderWorkspace();
    act(() => {
      for (const id of PANELS) usePlaygroundStore.getState().openOrFocus(id as PgWindowId);
    });
    for (const id of PANELS) {
      const el = document.querySelector(panelSpotlight(id));
      expect(el, `[data-window="${id}"]`).not.toBeNull();
      expect(el!.getAttribute('data-window')).toBe(id);
    }
    for (const card of panelCards) {
      expect(document.querySelector(card.spotlight!), `"${card.title}"`).not.toBeNull();
    }
  });

  it('Split mode: the Game pane always resolves; tabbed panes resolve via the real tab strip', () => {
    usePlaygroundStore.setState({ layoutMode: 'split' });
    renderWorkspace();
    // The Game Runner region is permanently visible on the right.
    expect(document.querySelector(panelSpotlight('game'))).not.toBeNull();
    // Chat / Code / Assets / Guide surface through the REAL tab strip.
    for (const [id, label] of [
      ['chat', 'Chat'],
      ['code', 'Code'],
      ['assets', 'Assets'],
      ['help', 'Guide'],
    ] as const) {
      act(() => screen.getByRole('tab', { name: label }).click());
      const el = document.querySelector(panelSpotlight(id));
      expect(el, `[data-pane="${id}"] after the ${label} tab`).not.toBeNull();
      expect(el!.getAttribute('data-pane')).toBe(id);
      // Every panel-level card pointing here resolves in split mode too.
      for (const card of panelCards.filter((c) => spotlightPanel(c.spotlight) === id)) {
        expect(document.querySelector(card.spotlight!), `"${card.title}" (split)`).not.toBeNull();
      }
    }
  });

  it('focusPanel routes per the LIVE layout — even through a handler bound before the flip', () => {
    let first: DemoStudioControls | null = null;
    renderWorkspace({
      surface: 'playground',
      bindStudioControls: (c) => {
        first ??= c; // keep the PRE-FLIP binding — the tour may still hold it
      },
    });
    expect(first).not.toBeNull();

    // Window mode: focusPanel opens/focuses the floating window.
    act(() => first!.focusPanel('help'));
    expect(document.querySelector('[data-window="help"]')).not.toBeNull();

    // Mid-tour flip to Split: the SAME handler must switch the real split tab,
    // not poke window state that is no longer on screen.
    act(() => usePlaygroundStore.getState().setLayoutMode('split'));
    act(() => first!.focusPanel('code'));
    expect(document.querySelector('[data-pane="code"]')).not.toBeNull();
    expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true');
    // 'game' is a no-op in split (always visible) — the tab must not change.
    act(() => first!.focusPanel('game'));
    expect(screen.getByRole('tab', { name: 'Code' })).toHaveAttribute('aria-selected', 'true');
    expect(document.querySelector('[data-pane="game"]')).not.toBeNull();

    // Flip back: window routing again.
    act(() => usePlaygroundStore.getState().setLayoutMode('window'));
    act(() => first!.focusPanel('assets'));
    expect(document.querySelector('[data-window="assets"]')).not.toBeNull();
  });
});
