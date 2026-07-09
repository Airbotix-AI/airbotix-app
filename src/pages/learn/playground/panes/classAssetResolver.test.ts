// @vitest-environment jsdom
//
// The class-asset resolver (class-shared-assets-prd, Model A): only class assets a
// game REFERENCES at assets/class/<name> are resolved to inline-ready virtual VFS
// files — fetched once (cached), never copied into the project VFS.
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { VfsFile } from '../../code/codeApi';
import type { ClassAssetView } from './playgroundApi';
import {
  referencedClassAssetNames,
  referencedClassAssets,
  useReferencedClassAssets,
} from './classAssetResolver';

function classAsset(name: string, over: Partial<ClassAssetView> = {}): ClassAssetView {
  return {
    id: `id-${name}`,
    name,
    kind: 'image',
    mime_type: 'image/png',
    size_bytes: 123,
    created_at: '2026-01-01T00:00:00.000Z',
    download_url: `https://signed.example/${name}?sig=x`,
    source: 'class',
    ...over,
  };
}

const text = (path: string, content: string): VfsFile => ({ path, content, kind: 'text', size: content.length });

describe('referencedClassAssetNames', () => {
  it('collects assets/class/<name> refs from TEXT files only', () => {
    const files: VfsFile[] = [
      text('src/scenes/Game.js', `this.load.image('stage', 'assets/class/game_stage.png');`),
      // An asset file's own path must NOT count as a reference to itself.
      { path: 'assets/class/other.png', content: 'data:image/png;base64,AAA', kind: 'asset', size: 3 },
    ];
    expect(referencedClassAssetNames(files)).toEqual(new Set(['game_stage.png']));
  });

  it('handles single/double/backtick quotes and multiple refs', () => {
    const files = [
      text('a.js', `load('assets/class/a.png'); load("assets/class/b.mp3"); load(\`assets/class/c.glb\`)`),
    ];
    expect(referencedClassAssetNames(files)).toEqual(new Set(['a.png', 'b.mp3', 'c.glb']));
  });

  it('captures a full filename with SPACES up to the closing quote (regression)', () => {
    // A .glb model named with spaces must resolve whole — a whitespace-stopping regex
    // would capture only "Animated", never match the library, and the game would fetch
    // the bare path against the opaque-origin frame → "Failed to fetch".
    const files = [
      text('g.js', `loader.load('assets/class/Animated Platformer Character.glb', onLoad);`),
    ];
    expect(referencedClassAssetNames(files)).toEqual(
      new Set(['Animated Platformer Character.glb']),
    );
  });
});

describe('referencedClassAssets', () => {
  it('returns only the library assets the code references', () => {
    const lib = [classAsset('game_stage.png'), classAsset('unused.png')];
    const files = [text('g.js', `this.load.image('s', 'assets/class/game_stage.png')`)];
    expect(referencedClassAssets(files, lib).map((a) => a.name)).toEqual(['game_stage.png']);
  });

  it('resolves a spaced .glb model name against the library (regression)', () => {
    const lib = [classAsset('Animated Platformer Character.glb', { kind: 'model', mime_type: 'model/gltf-binary' })];
    const files = [text('g.js', `loader.load('assets/class/Animated Platformer Character.glb', cb)`)];
    expect(referencedClassAssets(files, lib).map((a) => a.name)).toEqual([
      'Animated Platformer Character.glb',
    ]);
  });
});

describe('useReferencedClassAssets', () => {
  it('resolves a referenced class asset to a virtual data-URL VfsFile (no copy)', async () => {
    const lib = [classAsset('game_stage.png'), classAsset('unused.png')];
    const files = [text('g.js', `this.load.image('s', 'assets/class/game_stage.png')`)];
    const fetchDataUrl = vi.fn(async () => 'data:image/png;base64,STAGE');

    const { result } = renderHook(() => useReferencedClassAssets(files, lib, fetchDataUrl));

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]).toEqual({
      path: 'assets/class/game_stage.png',
      content: 'data:image/png;base64,STAGE',
      kind: 'asset',
      size: 123,
    });
    // Only the referenced asset is fetched — never the whole library.
    expect(fetchDataUrl).toHaveBeenCalledTimes(1);
    expect(fetchDataUrl).toHaveBeenCalledWith('https://signed.example/game_stage.png?sig=x');
  });

  it('omits an asset whose fetch fails (game shows it missing, never throws)', async () => {
    const lib = [classAsset('broken.png')];
    const files = [text('g.js', `this.load.image('s', 'assets/class/broken.png')`)];
    const fetchDataUrl = vi.fn(async () => {
      throw new Error('signed URL expired');
    });

    const { result } = renderHook(() => useReferencedClassAssets(files, lib, fetchDataUrl));

    await waitFor(() => expect(fetchDataUrl).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('caches by name — a re-render with the same ref does not refetch', async () => {
    const lib = [classAsset('a.png')];
    const fetchDataUrl = vi.fn(async () => 'data:image/png;base64,A');
    const first = [text('g.js', `'assets/class/a.png'`)];

    const { result, rerender } = renderHook(({ files }) => useReferencedClassAssets(files, lib, fetchDataUrl), {
      initialProps: { files: first },
    });
    await waitFor(() => expect(result.current).toHaveLength(1));

    // A fresh files array (new identity) that still references the same asset.
    await act(async () => rerender({ files: [text('g.js', `'assets/class/a.png' // tweaked`)] }));
    expect(fetchDataUrl).toHaveBeenCalledTimes(1);
  });
});
