import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TASKS = [
  { slug: 'draw-a-trex', rasterExtension: 'png' },
  { slug: 'draw-a-kitten', rasterExtension: 'webp' },
  { slug: 'draw-a-puppy', rasterExtension: 'webp' },
  { slug: 'draw-a-lion', rasterExtension: 'webp' },
  { slug: 'draw-a-shark', rasterExtension: 'webp' },
  { slug: 'draw-a-rocket', rasterExtension: 'webp' },
  { slug: 'draw-a-unicorn', rasterExtension: 'webp' },
  { slug: 'draw-a-race-car', rasterExtension: 'webp' },
] as const;

describe('Art Studio guided drawing assets', () => {
  it.each(TASKS)(
    '$slug has a cover, reference, ghost and five authored steps',
    ({ slug, rasterExtension }) => {
      const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v1');
      const requiredFiles = [
        `cover.${rasterExtension}`,
        `reference.${rasterExtension}`,
        'ghost.svg',
        'steps/01.svg',
        'steps/02.svg',
        'steps/03.svg',
        'steps/04.svg',
        'steps/05.svg',
      ];

      requiredFiles.forEach((relativePath) => {
        const assetPath = join(directory, relativePath);
        expect(existsSync(assetPath), `${slug}/${relativePath}`).toBe(true);
        expect(readFileSync(assetPath).byteLength, `${slug}/${relativePath}`).toBeGreaterThan(200);
      });
    },
  );
});
