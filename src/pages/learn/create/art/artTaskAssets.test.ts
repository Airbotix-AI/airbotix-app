import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ORIGINAL_TASK_SLUGS = [
  'draw-a-trex',
  'draw-a-kitten',
  'draw-a-puppy',
  'draw-a-lion',
  'draw-a-shark',
  'draw-a-rocket',
  'draw-a-unicorn',
  'draw-a-race-car',
] as const;

const SIMPLE_BATCH_TWO_SLUGS = [
  'draw-a-panda',
  'draw-a-bunny',
  'draw-a-butterfly',
  'draw-a-triceratops',
  'draw-a-sea-turtle',
  'draw-a-robot',
  'draw-an-excavator',
  'draw-a-baby-dragon',
] as const;

const FIRST_DRAWING_SLUGS = [
  'draw-a-first-fish',
  'draw-a-first-snail',
  'draw-a-first-ladybug',
  'draw-a-first-dinosaur',
  'draw-a-first-kitten',
  'draw-a-first-puppy',
  'draw-a-first-turtle',
  'draw-a-first-whale',
  'draw-a-first-car',
  'draw-a-first-rocket',
  'draw-a-first-flower',
  'draw-a-first-ice-cream',
] as const;

const SIMPLE_TASK_SLUGS = [...ORIGINAL_TASK_SLUGS, ...SIMPLE_BATCH_TWO_SLUGS] as const;
const TASK_SLUGS = [...FIRST_DRAWING_SLUGS, ...SIMPLE_TASK_SLUGS] as const;

describe('Art Studio guided drawing assets', () => {
  it.each(FIRST_DRAWING_SLUGS)('%s has exactly three first-drawing guides', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v1');
    const requiredFiles = [
      'cover.svg',
      'reference.svg',
      'ghost.svg',
      'steps/01.svg',
      'steps/02.svg',
      'steps/03.svg',
    ];

    requiredFiles.forEach((relativePath) => {
      const assetPath = join(directory, relativePath);
      expect(existsSync(assetPath), `${slug}/${relativePath}`).toBe(true);
      expect(readFileSync(assetPath).byteLength, `${slug}/${relativePath}`).toBeGreaterThan(200);
    });
    expect(existsSync(join(directory, 'steps/04.svg'))).toBe(false);
  });

  it.each(SIMPLE_TASK_SLUGS)('%s has four child-copyable drawing guides', (slug) => {
    const guideVersion = SIMPLE_BATCH_TWO_SLUGS.includes(
      slug as (typeof SIMPLE_BATCH_TWO_SLUGS)[number],
    )
      ? 'v1'
      : 'v3';
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, guideVersion);
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

  it.each(FIRST_DRAWING_SLUGS)('%s uses only a handful of bold drawing features', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v1');
    const reference = readFileSync(join(directory, 'reference.svg'), 'utf8');
    const pathStarts = reference.match(/[Mm](?=[-0-9])/g) ?? [];
    const standaloneShapes =
      reference.match(/<(?:circle|ellipse|polygon|polyline)\b/g) ?? [];
    const drawingFeatures = pathStarts.length + standaloneShapes.length;

    expect(drawingFeatures).toBeGreaterThanOrEqual(5);
    expect(drawingFeatures).toBeLessThanOrEqual(12);
    expect(reference).toContain('stroke-width="11"');
    expect(reference).not.toMatch(/<(?:filter|image|linearGradient|radialGradient)\b/);
  });

  it.each(SIMPLE_TASK_SLUGS)('%s draw-along stays simple without becoming a symbol', (slug) => {
    const guideVersion = SIMPLE_BATCH_TWO_SLUGS.includes(
      slug as (typeof SIMPLE_BATCH_TWO_SLUGS)[number],
    )
      ? 'v1'
      : 'v3';
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, guideVersion);
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

  it.each(ORIGINAL_TASK_SLUGS)('%s retains the immutable v2 prototype assets', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v2');

    expect(existsSync(join(directory, 'reference.svg'))).toBe(true);
    expect(existsSync(join(directory, 'ghost.svg'))).toBe(true);
  });

  it.each(TASK_SLUGS)('%s has a polished raster inspiration', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v1');
    const rasterExtension = slug === 'draw-a-trex' ? 'png' : 'webp';
    const assetPath = join(directory, `reference.${rasterExtension}`);

    expect(existsSync(assetPath), `${slug}/reference.${rasterExtension}`).toBe(true);
    expect(readFileSync(assetPath).byteLength).toBeGreaterThan(40_000);
  });

  it.each(ORIGINAL_TASK_SLUGS)('%s keeps its original five-step challenge guide', (slug) => {
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
