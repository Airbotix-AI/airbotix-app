import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const TASK_SLUGS = [
  'draw-a-trex',
  'draw-a-kitten',
  'draw-a-puppy',
  'draw-a-lion',
  'draw-a-shark',
  'draw-a-rocket',
  'draw-a-unicorn',
  'draw-a-race-car',
] as const;

describe('Art Studio guided drawing assets', () => {
  it.each(TASK_SLUGS)('%s has a v3 cover, reference, ghost and four authored steps', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v3');
    const requiredFiles = [
      'cover.svg',
      'reference.svg',
      'ghost.svg',
      'steps/01.svg',
      'steps/02.svg',
      'steps/03.svg',
      'steps/04.svg',
    ];

    requiredFiles.forEach((relativePath) => {
      const assetPath = join(directory, relativePath);
      expect(existsSync(assetPath), `${slug}/${relativePath}`).toBe(true);
      expect(readFileSync(assetPath).byteLength, `${slug}/${relativePath}`).toBeGreaterThan(200);
    });
    expect(existsSync(join(directory, 'steps/05.svg'))).toBe(false);
  });

  it.each(TASK_SLUGS)('%s stays simple without becoming an unrecognisable symbol', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v3');
    const reference = readFileSync(join(directory, 'reference.svg'), 'utf8');
    const pathStarts = reference.match(/[Mm](?=[-0-9])/g) ?? [];
    const standaloneShapes =
      reference.match(/<(?:circle|ellipse|polygon|polyline)\b/g) ?? [];
    const drawingFeatures = pathStarts.length + standaloneShapes.length;

    expect(drawingFeatures).toBeGreaterThanOrEqual(10);
    expect(drawingFeatures).toBeLessThanOrEqual(24);
    expect(reference).toContain('stroke-width="11"');
    expect(reference).not.toMatch(/<(?:filter|image|linearGradient|radialGradient)\b/);
  });

  it.each(TASK_SLUGS)('%s retains the immutable v2 prototype assets', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v2');

    expect(existsSync(join(directory, 'reference.svg'))).toBe(true);
    expect(existsSync(join(directory, 'ghost.svg'))).toBe(true);
  });

  it.each(TASK_SLUGS)('%s keeps its original v1 guide for the challenge level', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v1');
    const rasterExtension = slug === 'draw-a-trex' ? 'png' : 'webp';
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
  });
});
