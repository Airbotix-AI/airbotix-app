// @vitest-environment jsdom
//
// AI asset-generation entry points are gated by `featureFlags.ASSET_GENERATION_ENABLED`.
// While the flag is OFF the kid-facing affordances — the ✨ Generate bar and the
// Remix bar — must NOT render (the generation code stays in the tree, just hidden).
// Flipping the flag back on restores them (proves nothing was removed).
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetViewerPane } from './AssetViewerPane';
import { useProjectStore } from '../projectStore';
import { useWorkspaceUiStore } from '../workspaceUiStore';

// Toggle the flag per-test via a mutable backing value. A named ESM import is a
// live binding, so the component re-reads this getter on each render.
let assetGenEnabled = false;
vi.mock('../featureFlags', () => ({
  get ASSET_GENERATION_ENABLED() {
    return assetGenEnabled;
  },
}));

// A 1×1 PNG data URL so the asset is a real, previewable image.
const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgYGAAAAAEAAH2FzhVAAAAAElFTkSuQmCC';
const IMAGE_ASSET = { path: 'assets/generated/coin.png', content: PNG, kind: 'asset' as const, size: 100 };

afterEach(cleanup);
beforeEach(() => {
  assetGenEnabled = false;
  useProjectStore
    .getState()
    .setFiles([{ path: 'main.js', content: '', kind: 'text', size: 0 }, IMAGE_ASSET]);
  useWorkspaceUiStore.getState().restore(null);
});

describe('AssetViewerPane — asset generation disabled (featureFlags)', () => {
  it('hides the ✨ Generate bar in the grid when the flag is off', () => {
    render(<AssetViewerPane files={useProjectStore.getState().files} />);
    expect(screen.queryByTestId('asset-generate')).toBeNull();
    expect(screen.queryByTestId('asset-generate-prompt')).toBeNull();
  });

  it('hides the Remix bar on an image-asset detail when the flag is off', () => {
    render(<AssetViewerPane files={useProjectStore.getState().files} />);
    fireEvent.click(screen.getAllByTestId('asset-card')[0]); // open coin.png detail
    expect(screen.queryByTestId('asset-remix')).toBeNull();
    expect(screen.queryByTestId('asset-remix-prompt')).toBeNull();
  });

  it('shows the ✨ Generate bar again when the flag is turned back on (code retained)', () => {
    assetGenEnabled = true;
    render(<AssetViewerPane files={useProjectStore.getState().files} />);
    expect(screen.getByTestId('asset-generate')).toBeTruthy();
  });

  it('shows the Remix bar again on an image-asset detail when the flag is on', () => {
    assetGenEnabled = true;
    render(<AssetViewerPane files={useProjectStore.getState().files} />);
    fireEvent.click(screen.getAllByTestId('asset-card')[0]);
    expect(screen.getByTestId('asset-remix')).toBeTruthy();
  });
});
