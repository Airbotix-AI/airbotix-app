// @vitest-environment jsdom
// The Asset Viewer's try-demo bind seam (try-demo-mode-prd §3 step 7, D-DEMO-01):
// in demo mode the pane registers its REAL generate-bar setter/submit + the real
// open-details path, and the details view's Remix bar registers its real
// setter/submit — so the tour types into and submits through the production UI.
// Outside the demo provider the seam is inert (default-off injection point).

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../learn/code/codeApi';
import { AssetViewerPane } from '../learn/playground/panes/AssetViewerPane';
import { useWorkspaceUiStore } from '../learn/playground/workspaceUiStore';
import {
  DemoModeProvider,
  type DemoAssetPaneControls,
  type DemoMode,
  type DemoRemixControls,
} from './demoMode';

afterEach(() => {
  cleanup();
  useWorkspaceUiStore.getState().restore(null);
});

const PNG_DOT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const FILES: VfsFile[] = [
  { path: 'assets/generated/apple.png', kind: 'asset', content: PNG_DOT, size: 70 },
];

function renderPane(demo: DemoMode | null, onRequestAssetGen = vi.fn()) {
  const pane = <AssetViewerPane files={FILES} onRequestAssetGen={onRequestAssetGen} />;
  render(demo ? <DemoModeProvider value={demo}>{pane}</DemoModeProvider> : pane);
  return onRequestAssetGen;
}

describe('AssetViewerPane demo bind seam', () => {
  it('registers the pane controls only when a demo provider is present', () => {
    // Outside the demo there is no provider — the pane renders its normal UI
    // with the seam dormant (useDemoMode() is null).
    renderPane(null);
    expect(screen.getByTestId('asset-generate-prompt')).toBeInTheDocument();
    cleanup();

    const bindAssetPane = vi.fn();
    renderPane({ surface: 'playground', bindAssetPane });
    expect(bindAssetPane).toHaveBeenCalled();
    const controls: DemoAssetPaneControls = bindAssetPane.mock.calls.at(-1)![0];
    expect(typeof controls.setGeneratePrompt).toBe('function');
    expect(typeof controls.submitGenerate).toBe('function');
    expect(typeof controls.openAssetDetails).toBe('function');
  });

  it('setGeneratePrompt types into the REAL box; submitGenerate is the ✨ Generate handler', () => {
    let controls: DemoAssetPaneControls | null = null;
    const requested = renderPane({
      surface: 'playground',
      bindAssetPane: (c) => {
        controls = c;
      },
    });

    act(() => controls!.setGeneratePrompt('a shiny red apple sticker'));
    expect(screen.getByTestId('asset-generate-prompt')).toHaveValue('a shiny red apple sticker');

    act(() => controls!.submitGenerate());
    // The same path the button runs: request fired, box cleared.
    expect(requested).toHaveBeenCalledWith('a shiny red apple sticker');
    expect(screen.getByTestId('asset-generate-prompt')).toHaveValue('');
  });

  it('openAssetDetails opens the asset detail view, which binds the real Remix bar', () => {
    let controls: DemoAssetPaneControls | null = null;
    let remix: DemoRemixControls | null = null;
    const requested = renderPane({
      surface: 'playground',
      bindAssetPane: (c) => {
        controls = c;
      },
      bindAssetRemix: (c) => {
        remix = c;
      },
    });

    expect(remix).toBeNull(); // grid view — no details, no remix bar yet
    act(() => controls!.openAssetDetails('assets/generated/apple.png'));
    // The REAL detail view is open (remix bar mounted + bound).
    expect(screen.getByTestId('asset-remix-prompt')).toBeInTheDocument();
    expect(remix).not.toBeNull();

    act(() => remix!.setPrompt('make it golden and sparkly'));
    expect(screen.getByTestId('asset-remix-prompt')).toHaveValue('make it golden and sparkly');

    act(() => remix!.submit());
    // The same path the Remix button runs: ref'd to the OPEN asset, box cleared.
    expect(requested).toHaveBeenCalledWith('make it golden and sparkly', {
      refAssetPath: 'assets/generated/apple.png',
    });
    expect(screen.getByTestId('asset-remix-prompt')).toHaveValue('');
  });
});
