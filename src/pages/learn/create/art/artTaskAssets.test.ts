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
  it.each(TASK_SLUGS)('%s has a v2 cover, reference, ghost and four authored steps', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v2');
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

  it.each(TASK_SLUGS)('%s keeps the young-child reference below the line budget', (slug) => {
    const directory = join(process.cwd(), 'public', 'art-tasks', slug, 'v2');
    const reference = readFileSync(join(directory, 'reference.svg'), 'utf8');
    const visibleShapes = reference.match(/<(?:path|circle|ellipse|polygon|polyline)\b/g) ?? [];

    expect(visibleShapes.length).toBeLessThanOrEqual(12);
    expect(reference).toContain('stroke-width="11"');
    expect(reference).not.toMatch(/<(?:filter|image|linearGradient|radialGradient)\b/);
  });
});
