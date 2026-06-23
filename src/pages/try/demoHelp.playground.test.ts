// The bundled Game Guide corpus (try-demo-mode-prd §3 step 10). Three jobs:
//   1. Shape sanity — the corpus the REAL HelpPane renders offline must carry
//      the pane's default doc, the tour's diagram-rich doc, and valid pillars.
//   2. Real-pane search works over it (both tiers).
//   3. DRIFT ALARM — the corpus is a VERBATIM COPY of the real single source
//      (`platform-backend/src/help/help-content.ts`, D-HELP-02). When the
//      sibling checkout is present (the umbrella repo / CI with submodules),
//      every pillar, doc id/title/tag and block string is matched against the
//      backend source text — a backend corpus change fails HERE, loudly, with
//      the instruction to re-copy. (Skipped, visibly, when the sibling repo
//      isn't checked out.)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { searchDocs } from '../learn/playground/panes/help/helpApi';
import { DEMO_GUIDE_TOUR_DOC, DEMO_HELP_CORPUS } from './demoHelp.playground';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_HELP_CONTENT = path.resolve(
  HERE,
  '../../../../platform-backend/src/help/help-content.ts',
);
const backendSrc = fs.existsSync(BACKEND_HELP_CONTENT)
  ? fs.readFileSync(BACKEND_HELP_CONTENT, 'utf8')
  : null;

describe('DEMO_HELP_CORPUS', () => {
  it("contains the pane's default doc and well-formed pillars", () => {
    expect(DEMO_HELP_CORPUS.docs.map((d) => d.id)).toContain('start/what-is-a-game');
    const pillarIds = new Set(DEMO_HELP_CORPUS.pillars.map((p) => p.id));
    for (const doc of DEMO_HELP_CORPUS.docs) {
      expect(pillarIds.has(doc.pillar), `${doc.id} → unknown pillar ${doc.pillar}`).toBe(true);
      expect(doc.blocks.length).toBeGreaterThan(0);
    }
  });

  it('is searchable through the real pane search (both tiers)', () => {
    expect(searchDocs(DEMO_HELP_CORPUS.docs, 'score', 'lite').length).toBeGreaterThan(0);
    expect(searchDocs(DEMO_HELP_CORPUS.docs, 'how do I move?', 'pro').length).toBeGreaterThan(0);
  });

  it('the tour opens the most diagram-rich doc (§3 step 10)', () => {
    const diagramsIn = (id: string) =>
      DEMO_HELP_CORPUS.docs.find((d) => d.id === id)!.blocks.filter((b) => b.kind === 'diagram')
        .length;
    expect(DEMO_HELP_CORPUS.docs.map((d) => d.id)).toContain(DEMO_GUIDE_TOUR_DOC);
    const max = Math.max(...DEMO_HELP_CORPUS.docs.map((d) => diagramsIn(d.id)));
    expect(diagramsIn(DEMO_GUIDE_TOUR_DOC)).toBe(max);
    expect(diagramsIn(DEMO_GUIDE_TOUR_DOC)).toBeGreaterThanOrEqual(2);
  });
});

describe.skipIf(!backendSrc)(
  'DEMO_HELP_CORPUS is a verbatim copy of platform-backend help-content (drift alarm — RE-COPY on failure)',
  () => {
    // A copied string must appear in the backend source as the same literal —
    // prettier writes single-quoted strings (escaping ') or double-quoted ones
    // (when the text contains '), so accept either encoding.
    const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
    const asSingle = (s: string) => `'${esc(s).replace(/'/g, "\\'")}'`;
    const asDouble = (s: string) => `"${esc(s).replace(/"/g, '\\"')}"`;
    const inSource = (s: string) =>
      backendSrc!.includes(asSingle(s)) || backendSrc!.includes(asDouble(s));

    it('has the same pillars', () => {
      for (const p of DEMO_HELP_CORPUS.pillars) {
        expect(inSource(p.title), `pillar title drifted: ${p.title}`).toBe(true);
        expect(inSource(p.blurb), `pillar blurb drifted: ${p.blurb}`).toBe(true);
      }
    });

    it('has every backend doc, and nothing extra (doc-count parity)', () => {
      // One `pillar: '…'` assignment per doc in the backend source.
      const backendDocCount = (backendSrc!.match(/pillar: '/g) ?? []).length;
      expect(DEMO_HELP_CORPUS.docs.length).toBe(backendDocCount);
      for (const doc of DEMO_HELP_CORPUS.docs) {
        expect(backendSrc!.includes(`id: '${doc.id}'`), `doc not in backend: ${doc.id}`).toBe(true);
        expect(inSource(doc.title), `title drifted: ${doc.id}`).toBe(true);
      }
    });

    it('every tag and block string matches the backend source verbatim', () => {
      for (const doc of DEMO_HELP_CORPUS.docs) {
        for (const tag of doc.tags) {
          expect(inSource(tag), `tag drifted in ${doc.id}: ${tag}`).toBe(true);
        }
        for (const block of doc.blocks) {
          const strings =
            block.kind === 'list'
              ? block.items
              : block.kind === 'code'
                ? [block.code]
                : block.kind === 'diagram'
                  ? [block.diagram, block.alt]
                  : block.kind === 'heading'
                    ? [block.text, block.anchor]
                    : [block.text];
          for (const s of strings) {
            expect(
              inSource(s),
              `block drifted in ${doc.id} (${block.kind}): ${s.slice(0, 60)}…`,
            ).toBe(true);
          }
        }
      }
    });
  },
);
