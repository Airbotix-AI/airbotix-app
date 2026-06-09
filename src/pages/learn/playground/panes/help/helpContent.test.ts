import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, it, expect } from 'vitest';

import { GUIDE_PHASER_MAJOR, HELP_DOCS, HELP_PILLARS, type Pillar } from './helpContent';

const PILLAR_IDS = HELP_PILLARS.map((p) => p.id);

describe('help corpus invariants', () => {
  it('has at least one doc per pillar', () => {
    for (const p of PILLAR_IDS) {
      expect(HELP_DOCS.some((d) => d.pillar === p)).toBe(true);
    }
  });

  it('every doc id is unique and shaped `<pillar>/<slug>`', () => {
    const ids = new Set<string>();
    for (const d of HELP_DOCS) {
      expect(ids.has(d.id), `duplicate id ${d.id}`).toBe(false);
      ids.add(d.id);
      const [pillar, slug] = d.id.split('/');
      expect(PILLAR_IDS).toContain(pillar as Pillar);
      expect(pillar).toBe(d.pillar);
      expect(slug, `id ${d.id} missing slug`).toBeTruthy();
    }
  });

  it('every doc has at least one heading with a unique anchor', () => {
    for (const d of HELP_DOCS) {
      const anchors = d.blocks.filter((b) => b.kind === 'heading').map((b) => (b as { anchor: string }).anchor);
      expect(anchors.length, `${d.id} has no heading`).toBeGreaterThan(0);
      expect(new Set(anchors).size, `${d.id} has duplicate anchors`).toBe(anchors.length);
    }
  });
});

// HJ6 / D‑HELP‑06 — the runtime-contract doc must not teach a stale contract.
describe('runtime-contract doc stays in sync (HJ6)', () => {
  const doc = HELP_DOCS.find((d) => d.id === 'phaser/runtime-contract');

  it('exists and forbids import/export at a stable `no-imports` anchor', () => {
    expect(doc).toBeDefined();
    const anchors = doc!.blocks.filter((b) => b.kind === 'heading').map((b) => (b as { anchor: string }).anchor);
    expect(anchors).toContain('no-imports');
    const text = JSON.stringify(doc!.blocks).toLowerCase();
    expect(text).toContain('import');
    expect(text).toContain('global');
    expect(text).toContain('main.js');
  });

  it('teaches the SAME Phaser major as the declared engine dependency', () => {
    // Read the DECLARED dependency (source of truth), not the installed package —
    // a Phaser major bump that the Guide does not reflect fails this build.
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
    const declared: string = pkg.dependencies?.phaser ?? pkg.devDependencies?.phaser ?? '';
    const major = parseInt(declared.replace(/[^\d.]/g, '').split('.')[0] ?? '', 10);
    expect(Number.isNaN(major)).toBe(false);
    expect(GUIDE_PHASER_MAJOR).toBe(major);
  });
});
