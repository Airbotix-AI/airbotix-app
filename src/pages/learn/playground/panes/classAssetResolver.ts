// Resolve class shared assets a game REFERENCES into inline-ready virtual VFS
// files (class-shared-assets-prd, Model A). A class asset is NEVER copied into the
// kid's project VFS — the game refers to it at `assets/class/<name>` and the runtime
// resolves the bytes from the shared class library at build time (a `data:` URL
// inlined into the sandbox srcdoc, exactly like a real VFS asset). The only place a
// class asset becomes a persisted copy is the frozen public SHARE snapshot, which
// the backend bakes at share-mint.
//
// We resolve only the class assets the code actually references (not the whole
// library), and cache each by name so a referenced asset is fetched once. The
// signed `download_url` is fetched to a `data:` URL and inlined — the signed URL
// itself never enters the sandboxed game (playground CLAUDE.md security model holds).

import { useEffect, useMemo, useRef, useState } from 'react';

import type { VfsFile } from '../../code/codeApi';
import { CLASS_ASSET_DIR } from './assetMeta';
import { fetchAssetDataUrl, type ClassAssetView } from './playgroundApi';

// A quoted `assets/class/<name>` reference — the SAME quote-anchored form the srcdoc
// inliner rewrites (`buildGamePreview.ts` `inlineAssetRefs`), so a name we resolve is a
// name that actually gets inlined. `<name>` runs to the matching closing quote and MAY
// contain spaces (e.g. "Animated Platformer Character.glb") — a naïve `\S+`/`\s`-stopping
// class truncates at the first space and the asset never resolves → the game fetches the
// bare path against the opaque-origin frame → "Failed to fetch". Class assets are flat (a
// name, no nested dirs), so the captured name matches a class asset by `asset.name`.
const CLASS_REF = /(["'`])assets\/class\/([^"'`]+)\1/g;

/** The class-asset names a game's TEXT files reference at `assets/class/<name>`. */
export function referencedClassAssetNames(files: VfsFile[]): Set<string> {
  const names = new Set<string>();
  if (!Array.isArray(files)) return names;
  for (const f of files) {
    if (f.kind !== 'text') continue;
    for (const m of f.content.matchAll(CLASS_REF)) names.add(m[2]);
  }
  return names;
}

/** The class assets a game references, resolved against the shared library. */
export function referencedClassAssets(
  files: VfsFile[],
  classAssets: ClassAssetView[],
): ClassAssetView[] {
  // `classAssets` can be non-array while its query is still resolving — guard it.
  if (!Array.isArray(classAssets)) return [];
  const names = referencedClassAssetNames(files);
  return classAssets.filter((a) => names.has(a.name));
}

/** `referencedClassAssets`, kept identity-stable while the referenced-name set is
 *  unchanged (so code keystrokes don't churn it). Caches the last value by a name
 *  key in a ref — deterministic during render, the idiomatic "stable derived value". */
function useReferencedStable(files: VfsFile[], classAssets: ClassAssetView[]): ClassAssetView[] {
  const referenced = referencedClassAssets(files, classAssets);
  const key = referenced
    .map((a) => a.name)
    .sort()
    .join('|');
  const cache = useRef<{ key: string; value: ClassAssetView[] } | null>(null);
  if (!cache.current || cache.current.key !== key) {
    cache.current = { key, value: referenced };
  }
  return cache.current.value;
}

/**
 * Virtual (never-persisted) VFS assets for the class assets the game references,
 * each resolved to a `data:` URL ready for `buildGamePreview` to inline. Feed the
 * result to `GameFrame`/`GameRunnerPane` as `virtualAssets`. Only referenced assets
 * are fetched (once, cached by name); an unresolved fetch simply omits that asset
 * (the game shows it missing — never throws). `fetchDataUrl` is injectable for tests.
 */
export function useReferencedClassAssets(
  files: VfsFile[],
  classAssets: ClassAssetView[],
  fetchDataUrl: (url: string) => Promise<string> = fetchAssetDataUrl,
): VfsFile[] {
  // name -> data URL. A ref (stable across renders) is the cache of record; state
  // mirrors it to trigger a rebuild when a new asset resolves.
  const cacheRef = useRef<Record<string, string>>({});
  const [resolved, setResolved] = useState<Record<string, string>>({});

  // Key by the SET of referenced names (+ library identity), not `files` — so a
  // plain code keystroke that doesn't change which class assets are referenced
  // keeps `referenced` (and thus `virtualAssets`) identity-stable, and the runner
  // isn't rebuilt for nothing.
  const referenced = useReferencedStable(files, classAssets);

  useEffect(() => {
    const missing = referenced.filter((a) => !(a.name in cacheRef.current));
    if (missing.length === 0) return;
    let cancelled = false;
    void Promise.all(
      missing.map(async (a) => {
        try {
          cacheRef.current[a.name] = await fetchDataUrl(a.download_url);
        } catch {
          // Leave unresolved — the game shows the missing asset rather than crashing.
        }
      }),
    ).then(() => {
      if (!cancelled) setResolved({ ...cacheRef.current });
    });
    return () => {
      cancelled = true;
    };
  }, [referenced, fetchDataUrl]);

  return useMemo(
    () =>
      referenced
        .filter((a) => a.name in resolved)
        .map<VfsFile>((a) => ({
          path: `${CLASS_ASSET_DIR}/${a.name}`,
          content: resolved[a.name],
          kind: 'asset',
          size: a.size_bytes,
        })),
    [referenced, resolved],
  );
}
