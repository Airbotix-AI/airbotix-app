import { describe, it, expect } from 'vitest';

import {
  ASSET_LIBRARY,
  LIBRARY_CATEGORIES,
  searchLibrary,
  twemojiUrl,
  type LibraryAsset,
} from './assetLibrary';

describe('twemojiUrl (codepoint → Twemoji asset URL, D-ASSET-12)', () => {
  it('maps a single-codepoint emoji to its hex .png filename', () => {
    expect(twemojiUrl('🪙')).toBe(
      'https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/72x72/1fa99.png',
    );
    expect(twemojiUrl('⭐')).toMatch(/\/72x72\/2b50\.png$/);
  });

  it('drops the VS16 (U+FE0F) presentation selector, like Twemoji does', () => {
    // ❤️ is U+2764 U+FE0F → file is 2764.png (no fe0f).
    expect(twemojiUrl('❤️')).toMatch(/\/2764\.png$/);
  });

  it('supports the svg form', () => {
    expect(twemojiUrl('🪙', 'svg')).toMatch(/\/svg\/1fa99\.svg$/);
  });

  it('pins a version tag, never @latest', () => {
    expect(twemojiUrl('🐶')).toContain('@15.1.0');
    expect(twemojiUrl('🐶')).not.toContain('@latest');
  });
});

describe('ASSET_LIBRARY (the v1 emoji Library)', () => {
  it('is non-empty and every entry is a CC-BY emoji image with a Twemoji URL', () => {
    expect(ASSET_LIBRARY.length).toBeGreaterThan(40);
    for (const a of ASSET_LIBRARY) {
      expect(a.provider).toBe('emoji');
      expect(a.license).toBe('CC-BY-4.0');
      expect(a.kind).toBe('image');
      expect(a.url).toContain('/jdecked/twemoji@');
      expect(a.thumbUrl).toBe(a.url);
      expect(LIBRARY_CATEGORIES).toContain(a.category);
    }
  });

  it('has stable, unique ids', () => {
    const ids = ASSET_LIBRARY.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('searchLibrary', () => {
  it('returns everything in a category when the query is empty', () => {
    const items = searchLibrary('', 'items');
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((a: LibraryAsset) => a.category === 'items')).toBe(true);
  });

  it('matches on name (case-insensitive)', () => {
    const r = searchLibrary('COIN');
    expect(r.some((a) => a.name === 'Coin')).toBe(true);
  });

  it('matches on tags, not just the name', () => {
    // The coin carries the tag "money" but isn't named "money".
    const r = searchLibrary('money');
    expect(r.some((a) => a.name === 'Coin')).toBe(true);
  });

  it('intersects category + query', () => {
    const r = searchLibrary('star', 'nature');
    expect(r.every((a) => a.category === 'nature')).toBe(true);
    expect(r.some((a) => a.name === 'Star')).toBe(true);
  });

  it('returns nothing for a miss', () => {
    expect(searchLibrary('definitelynotanasset')).toHaveLength(0);
  });
});
