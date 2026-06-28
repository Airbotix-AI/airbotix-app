// @vitest-environment jsdom
//
// Class shared asset library (class-shared-assets-prd): the Asset Viewer's
// "Class" tab. Covers (a) the tab is hidden with no class assets, (b) it shows +
// its grid renders when class assets are provided, (c) "Add to my game" fetches
// the signed bytes and funnels them through createFile into the VFS, and (d) the
// read-only (teacher-live) viewer hides "Add to my game" but still previews.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetViewerPane } from './AssetViewerPane';
import type { ClassAssetView } from './playgroundApi';
import { useProjectStore } from '../projectStore';
import type { SaveResult } from '../projectPersistence';
import { useWorkspaceUiStore } from '../workspaceUiStore';

// Live-store harness: mirrors how PlaygroundApp feeds the pane the subscribed VFS,
// so a createFile() shows up in the grid (a static `files` prop snapshot wouldn't).
function LiveAssetViewer({ onSaveNow }: { onSaveNow?: () => Promise<SaveResult> }) {
  const files = useProjectStore((s) => s.files);
  return <AssetViewerPane files={files} classAssets={[]} onSaveNow={onSaveNow} />;
}

// Mock the bytes-fetch so "Add to my game" needs no network; we assert the data
// URL it returns is what lands in the VFS.
const fetchAssetDataUrl = vi.fn();
vi.mock('./playgroundApi', () => ({
  fetchAssetDataUrl: (...a: unknown[]) => fetchAssetDataUrl(...a),
}));

const CLASS_ASSETS: ClassAssetView[] = [
  {
    id: 'ca-1',
    class_id: 'class-1',
    name: 'hero.png',
    kind: 'image',
    mime_type: 'image/png',
    size_bytes: 2048,
    created_at: '2026-06-23T00:00:00Z',
    download_url: 'https://signed.example/hero.png?sig=abc',
  },
  {
    id: 'ca-2',
    class_id: 'class-1',
    name: 'jump.mp3',
    kind: 'audio',
    mime_type: 'audio/mpeg',
    size_bytes: 4096,
    created_at: '2026-06-23T00:00:00Z',
    download_url: 'https://signed.example/jump.mp3?sig=def',
  },
];

// A deterministic FileReader so `fileToDataUrl` resolves predictably regardless of
// jsdom timing (the real one can stall in a full-file run).
class SyncFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL() {
    this.result = 'data:image/png;base64,aGVsbG8=';
    queueMicrotask(() => this.onload?.());
  }
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks(); // a test spies on the store's createFile — don't leak it
  vi.unstubAllGlobals();
});
beforeEach(() => {
  fetchAssetDataUrl.mockReset();
  // Fresh stores so persisted source/selection never leaks between tests.
  useProjectStore.getState().setFiles([{ path: 'main.js', content: '', kind: 'text', size: 0 }]);
  useWorkspaceUiStore.getState().restore(null);
});

describe('AssetViewerPane — Class tab gating (class-shared-assets-prd)', () => {
  it('hides the Class tab when there are no class assets', () => {
    render(<AssetViewerPane files={useProjectStore.getState().files} classAssets={[]} />);
    expect(screen.queryByTestId('asset-source-class')).toBeNull();
    // The other two sources are always present.
    expect(screen.getByTestId('asset-source-mine')).toBeTruthy();
    expect(screen.getByTestId('asset-source-library')).toBeTruthy();
  });

  it('hides the Class tab when classAssets is omitted entirely', () => {
    render(<AssetViewerPane files={useProjectStore.getState().files} />);
    expect(screen.queryByTestId('asset-source-class')).toBeNull();
  });

  it('shows the Class tab and renders the grid when class assets are provided', () => {
    render(<AssetViewerPane files={useProjectStore.getState().files} classAssets={CLASS_ASSETS} />);
    const tab = screen.getByTestId('asset-source-class');
    expect(tab).toBeTruthy();
    fireEvent.click(tab);
    const cards = screen.getAllByTestId('class-asset-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('hero.png');
    expect(cards[1].textContent).toContain('jump.mp3');
  });
});

describe('AssetViewerPane — Add to my game (class-shared-assets-prd)', () => {
  it('downloads the signed bytes and copies them into the VFS via createFile', async () => {
    const dataUrl = 'data:image/png;base64,AAA';
    fetchAssetDataUrl.mockResolvedValue(dataUrl);
    const createSpy = vi.spyOn(useProjectStore.getState(), 'createFile');

    render(<AssetViewerPane files={useProjectStore.getState().files} classAssets={CLASS_ASSETS} />);
    fireEvent.click(screen.getByTestId('asset-source-class'));
    fireEvent.click(screen.getAllByTestId('class-asset-card')[0]); // open hero.png detail
    fireEvent.click(screen.getByTestId('class-asset-add'));

    await waitFor(() => expect(createSpy).toHaveBeenCalled());
    // The signed URL is fetched (never referenced inside the game), and the bytes
    // land at assets/class/<name> as a VFS asset.
    expect(fetchAssetDataUrl).toHaveBeenCalledWith('https://signed.example/hero.png?sig=abc');
    expect(createSpy).toHaveBeenCalledWith('assets/class/hero.png', 'asset', dataUrl);
  });
});

describe('AssetViewerPane — enlarge a class image (image lightbox)', () => {
  it('opens the full-screen lightbox from the class image detail and closes it', () => {
    render(<AssetViewerPane files={useProjectStore.getState().files} classAssets={CLASS_ASSETS} />);
    fireEvent.click(screen.getByTestId('asset-source-class'));
    fireEvent.click(screen.getAllByTestId('class-asset-card')[0]); // hero.png (image)
    expect(screen.queryByTestId('image-lightbox')).toBeNull();
    fireEvent.click(screen.getByTestId('asset-enlarge'));
    expect(screen.getByTestId('image-lightbox')).toBeTruthy();
    expect(screen.getByTestId('image-lightbox-img').getAttribute('src')).toBe(
      'https://signed.example/hero.png?sig=abc',
    );
    fireEvent.click(screen.getByTestId('image-lightbox-close'));
    expect(screen.queryByTestId('image-lightbox')).toBeNull();
  });
});

describe('AssetViewerPane — read-only viewer (D-LV-6)', () => {
  it('hides "Add to my game" but still previews the asset', () => {
    render(
      <AssetViewerPane files={useProjectStore.getState().files} classAssets={CLASS_ASSETS} readOnly />,
    );
    fireEvent.click(screen.getByTestId('asset-source-class'));
    fireEvent.click(screen.getAllByTestId('class-asset-card')[0]);
    // Detail (preview + code-ref) renders, but no add affordance.
    expect(screen.getByTestId('class-asset-codeRef')).toBeTruthy();
    expect(screen.queryByTestId('class-asset-add')).toBeNull();
  });
});

// The import-persist fix: an over-cap file must be BLOCKED at import with a clear
// message — not added to the VFS, "saved on device", then lost on reload.
describe('AssetViewerPane — import size cap (50 MB)', () => {
  const fileOfSize = (name: string, bytes: number): File => {
    const f = new File(['x'], name, { type: 'image/png' });
    Object.defineProperty(f, 'size', { value: bytes }); // avoid allocating real MBs
    return f;
  };

  const smallPng = () => new File(['hello'], 'sprite.png', { type: 'image/png' });
  // Scope EVERYTHING to this render's container — `document`/`screen` would see any
  // leftover DOM from a prior test (a stale file input → fireEvent hits nothing).
  const pickFile = (container: HTMLElement, f: File) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [f] } });
  };

  it('reveals an imported asset only AFTER its upload is confirmed (saved)', async () => {
    vi.stubGlobal('FileReader', SyncFileReader);
    let resolveSave!: (r: SaveResult) => void;
    const onSaveNow = vi.fn(() => new Promise<SaveResult>((res) => (resolveSave = res)));
    const { container } = render(<LiveAssetViewer onSaveNow={onSaveNow} />);
    const q = within(container);

    pickFile(container, smallPng());
    // While uploading: the indicator shows and the asset is NOT in the grid yet.
    expect(await q.findByTestId('asset-uploading')).toBeTruthy();
    expect(q.queryAllByTestId('asset-card')).toHaveLength(0);

    // Wait until the upload actually started (onSaveNow called) before resolving it.
    await waitFor(() => expect(onSaveNow).toHaveBeenCalled());
    await act(async () => resolveSave({ status: 'saved', version: 1 }));
    // Confirmed: indicator clears and the asset now appears + lives in the VFS.
    await waitFor(() => expect(q.queryByTestId('asset-uploading')).toBeNull());
    expect(q.queryAllByTestId('asset-card')).toHaveLength(1);
    expect(useProjectStore.getState().files.some((f) => f.path.startsWith('assets/'))).toBe(true);
  });

  it('does NOT reveal the asset if the upload fails — rolled back, error shown', async () => {
    vi.stubGlobal('FileReader', SyncFileReader);
    const onSaveNow = vi.fn(async (): Promise<SaveResult> => ({ status: 'rejected', reason: 'nope' }));
    const { container } = render(<LiveAssetViewer onSaveNow={onSaveNow} />);
    const q = within(container);

    pickFile(container, smallPng());
    expect(await q.findByText(/Couldn.t upload/)).toBeTruthy();
    // Nothing reaches the grid AND nothing lingers in the VFS (rolled back).
    expect(q.queryAllByTestId('asset-card')).toHaveLength(0);
    expect(useProjectStore.getState().files.some((f) => f.path.startsWith('assets/'))).toBe(false);
  });

  it('blocks an over-cap (>50 MB) import with a clear message and adds nothing to the VFS', async () => {
    render(<AssetViewerPane files={useProjectStore.getState().files} classAssets={[]} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOfSize('huge.png', 51 * 1024 * 1024)] } });

    expect(await screen.findByText(/too big to save \(max 50 MB\)/)).toBeTruthy();
    // Nothing under assets/ was created — the over-cap file was never imported.
    const paths = useProjectStore.getState().files.map((f) => f.path);
    expect(paths.some((p) => p.startsWith('assets/'))).toBe(false);
  });
});
